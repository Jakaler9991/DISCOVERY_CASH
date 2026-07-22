# DOSBox-x Distributed Deployment & Monitoring (starter)

This workspace contains helper scripts to deploy and run DOSBox/MS-DOS programs across multiple Linux hosts, plus a small Prometheus exporter to monitor runs.

Files added:
- `scripts/install_dosbox.sh` — installs `dosbox-x`, `rsync`, `python3` and `prometheus_client`.
- `bin/dosctl` — simple CLI to `deploy`, `run`, `stop`, and `status` DOS apps on remote hosts via SSH+rsync.
- `scripts/sync_hook.sh` — post-sync hook to expand archives and run plugin scripts.
- `exporter/dos_exporter.py` — lightweight Prometheus exporter exposing `dosbox_app_running` metric.

Quick start (sensible defaults):

1. Install dependencies on your control machine:

```bash
sudo bash scripts/install_dosbox.sh
```

2. Create a `hosts.txt` with one SSH reachable hostname per line.

3. Prepare your DOS app in a folder, include the `.exe` that runs under DOSBox (e.g. `app.exe`).

4. Deploy to hosts:

```bash
bin/dosctl deploy --hosts hosts.txt --src ./my_dos_app --exe app.exe
```

5. Start the app on all hosts:

```bash
bin/dosctl run --hosts hosts.txt --remote-dir /opt/dos_apps --exe app.exe
```

6. On each host you can run the exporter to expose status to Prometheus:

```bash
python3 exporter/dos_exporter.py --app app --pidfile /tmp/dosbox-app.pid --port 9100
```

Prometheus & Grafana:
- Configure Prometheus to scrape each host's exporter (port 9100).
- Build a Grafana dashboard showing the `dosbox_app_running` metric across hosts.

Notes & next steps:
- This is a starter scaffold. To reach full automation you may want:
  - Systemd unit templates or containers for controlled process supervision.
  - Secure authentication (deploy SSH keys, optionally LDAP/OAuth for control plane).
  - A file-expansion plugin that integrates with `sync_hook.sh` for custom transforms.
  - Ansible or Terraform to scale host provisioning and monitoring stack.

If you want, I can now:
- implement systemd unit and a sample Grafana dashboard JSON, or
- add an automated build step (Open Watcom/DJGPP) to produce DOS EXEs from C sources.
