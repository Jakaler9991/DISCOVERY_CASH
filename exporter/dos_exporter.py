#!/usr/bin/env python3
"""Simple Prometheus exporter for DOSBox deployment status."""
from prometheus_client import start_http_server, Gauge
import time
import os
import argparse


def read_pid(pidfile):
    try:
        with open(pidfile, 'r') as f:
            pid = int(f.read().strip())
        return pid
    except Exception:
        return None


def main(port, appname, pidfile):
    g_running = Gauge('dosbox_app_running', '1 if app is running, 0 otherwise', ['app'])
    start_http_server(port)
    while True:
        pid = read_pid(pidfile)
        running = 0
        if pid:
            # check process exists
            try:
                os.kill(pid, 0)
                running = 1
            except Exception:
                running = 0
        g_running.labels(app=appname).set(running)
        time.sleep(5)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=9100)
    parser.add_argument('--app', required=True, dest='appname')
    parser.add_argument('--pidfile', required=True)
    args = parser.parse_args()
    main(args.port, args.appname, args.pidfile)
