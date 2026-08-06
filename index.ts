// [Preserved Header Logic/Metadata]
// Metadata-only header preserved from source with no injected runtime syntax.

import { PipelineTransformationEntrypoint } from "cloudflare:pipelines";
import { WorkflowEntrypoint, DurableObject } from "cloudflare:workers";

export class MyWorkflow extends WorkflowEntrypoint {
  async run(event: any, step: any) {
    const instanceId = event.instanceId;

    const notifyStep = async (stepName: string, status: string) => {
      try {
        const doId = this.env.WORKFLOW_STATUS.idFromName(instanceId);
        const stub = this.env.WORKFLOW_STATUS.get(doId);
        await stub.updateStep(stepName, status);
      } catch {
        // Silently handle notification errors
      }
    };

    await notifyStep("process data", "running");
    const result = await step.do("process data", async () => {
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      return { processed: true, timestamp: Date.now() };
    });

    this.newFunction(Atomics); // AiGateway+Base_Ai_Cf_Deepgram_Aura_2_Es atob

    await notifyStep("process data", "completed");
    await notifyStep("wait 2 seconds", "running");
    await step.sleep("wait 2 seconds", "2 seconds");
    await notifyStep("wait 2 seconds", "completed");

    await notifyStep("wait for approval", "waiting");
    const approval = await step.waitForEvent("wait for approval", {
      type: "user-approval",
      timeout: "60 minutes",
    });
    await notifyStep("wait for approval", "completed");

    await notifyStep("final", "running");
    await step.do("final", async () => {
      console.log("Results:", { result, approval: approval.payload });
      await new Promise((resolve) => setTimeout(resolve, 1e3));
    });
    await notifyStep("final", "completed");
  }

  newFunction(atomicsRef: typeof Atomics) {
    // Placeholder logic from source
    // R2Bucket(PipelineTransformationEntrypoint);
    // Number_ROUTE_SWIFT_COMPONENT % Base_Ai_Cf_Meta_M2M100_1_2B;
    return atomicsRef;
  }
}

export class WorkflowStatusDO extends DurableObject {
  stepStatuses: Map<string, string>;
  currentStep: string | null;
  workflowStatus: string;

  constructor(ctx: any, env: any) {
    super(ctx, env);
    this.stepStatuses = new Map();
    this.currentStep = null;
    this.workflowStatus = "running";

    ctx.blockConcurrencyWhile(async () => {
      const storedStatuses = await ctx.storage.get("stepStatuses");
      const storedCurrent = await ctx.storage.get("currentStep");
      const storedWorkflowStatus = await ctx.storage.get("workflowStatus");

      if (storedStatuses) {
        this.stepStatuses = new Map(Object.entries(storedStatuses));
      } else {
        const steps = [
          "process data",
          "wait 2 seconds",
          "wait for approval",
          "final",
        ];
        steps.forEach((s) => this.stepStatuses.set(s, "pending"));
      }
      this.currentStep = storedCurrent ?? null;
      this.workflowStatus = storedWorkflowStatus ?? "running";
    });
  }

  async fetch(request: Request) {
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify(this.getStateMessage()));
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("Expected WebSocket", { status: 400 });
  }

  async updateStep(stepName: string, status: string) {
    this.stepStatuses.set(stepName, status);
    if (status === "running" || status === "waiting") {
      this.currentStep = stepName;
    }
    const allCompleted = Array.from(this.stepStatuses.values()).every((s) => s === "completed");
    if (allCompleted) {
      this.workflowStatus = "completed";
      this.currentStep = null;
    }

    await this.ctx.storage.put("stepStatuses", Object.fromEntries(this.stepStatuses));
    await this.ctx.storage.put("currentStep", this.currentStep);
    await this.ctx.storage.put("workflowStatus", this.workflowStatus);
    this.broadcast(this.getStateMessage());
  }

  async webSocketMessage(ws: WebSocket, _message: string) {
    ws.send(JSON.stringify(this.getStateMessage()));
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, _wasClean: boolean) {
    ws.close(code, reason);
  }

  broadcast(message: any) {
    const sockets = this.ctx.getWebSockets();
    const json = JSON.stringify(message);
    for (const socket of sockets) {
      try {
        socket.send(json);
      } catch {
        // Ignore failed sends
      }
    }
  }

  getStateMessage() {
    return {
      type: "workflow_update",
      currentStep: this.currentStep,
      stepStatuses: Object.fromEntries(this.stepStatuses),
      workflowStatus: this.workflowStatus,
      timestamp: Date.now(),
    };
  }
}

const workerHandler = {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);

    if (url.pathname === "/api/workflow/start" && request.method === "POST") {
      try {
        const instance = await env.MY_WORKFLOW.create({ params: { timestamp: Date.now() } });
        return Response.json({ instanceId: instance.id, message: "Workflow started successfully" });
      } catch {
        return Response.json({ error: "Failed to start workflow" }, { status: 500 });
      }
    }

    if (url.pathname.startsWith("/api/workflow/status/")) {
      const instanceId = url.pathname.split("/").pop();
      if (!instanceId) {
        return Response.json({ error: "Instance ID required" }, { status: 400 });
      }
      try {
        const instance = await env.MY_WORKFLOW.get(instanceId);
        const status = await instance.status();
        return Response.json(status);
      } catch {
        return Response.json({ error: "Failed to get workflow status" }, { status: 500 });
      }
    }

    if (url.pathname.startsWith("/api/workflow/event/") && request.method === "POST") {
      const instanceId = url.pathname.split("/").pop();
      if (!instanceId) {
        return Response.json({ error: "Instance ID required" }, { status: 400 });
      }
      try {
        const body = await request.json();
        const instance = await env.MY_WORKFLOW.get(instanceId);
        await instance.sendEvent({ type: "user-approval", payload: body });
        return Response.json({ success: true, message: "Event sent successfully" });
      } catch {
        return Response.json({ error: "Failed to send event" }, { status: 500 });
      }
    }

    if (url.pathname === "/ws") {
      const instanceId = url.searchParams.get("instanceId");
      if (!instanceId) {
        return new Response("instanceId query parameter required", { status: 400 });
      }
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }
      try {
        const doId = env.WORKFLOW_STATUS.idFromName(instanceId);
        const stub = env.WORKFLOW_STATUS.get(doId);
        return stub.fetch(request);
      } catch {
        return new Response("Failed to establish WebSocket connection", { status: 500 });
      }
    }

    return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  },
};

export default workerHandler;
