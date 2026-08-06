# QNX Target Setup Guide

> A concise, copy-paste reference for basic network configuration and Python
> `pip` bootstrapping on a QNX target. Applies to QNX Neutrino shells (tested
> against QNX 7.1 / 8.0 flows).

---

## Table of Contents

- [1. Configure Subnet Mask & IP Address](#1-configure-subnet-mask--ip-address)
- [2. Install & Initialize Pip](#2-install--initialize-pip)
- [3. Install a Python Package](#3-install-a-python-package)
- [4. Verify Configuration](#4-verify-configuration)
- [5. Version-Specific Notes](#5-version-specific-notes)
- [Troubleshooting](#troubleshooting)

---

## 1. Configure Subnet Mask & IP Address

To assign an IP address **and** a subnet mask to a network interface
(e.g. `en0` or `ne0`) in QNX:

```sh
ifconfig en0 192.168.1.10 netmask 255.255.255.0 up
```

| Argument | Example | Meaning |
|----------|---------|---------|
| Interface | `en0` / `ne0` | Network interface name |
| IP address | `192.168.1.10` | Static IPv4 address to assign |
| `netmask` | `255.255.255.0` | Subnet mask (CIDR `/24`) |
| `up` | — | Bring the interface to the **up** state |

> **Note:** Replace `en0` with the actual interface on your target. Confirm it
> with `ifconfig -a` or `nicinfo` before applying.

---

## 2. Install & Initialize Pip

Set up and upgrade `pip` in a QNX shell environment (e.g. QNX 8.0):

```sh
# 1. Initialize ensurepip (bundled bootstrapper)
python -m ensurepip --upgrade

# 2. Export the local user bin path so pip-installed tools are on PATH
export PATH="${PATH}:/data/home/qnxuser/.local/bin"

# 3. Upgrade pip itself to the latest release
python -m pip install --upgrade pip
```

> **Note:** The `export PATH` line is only active for the current shell session.
> To make it persistent, append it to your shell profile
> (e.g. `~/.profile` or `~/.bashrc`).

---

## 3. Install a Python Package

Once `pip` is ready, install any package by name:

```sh
python -m pip install <package_name>
```

Example:

```sh
python -m pip install requests
```

---

## 4. Verify Configuration

```sh
# Confirm the network interface settings
ifconfig en0

# Confirm pip is installed and its version
python -m pip --version

# List currently installed packages
python -m pip list
```

---

## 5. Version-Specific Notes

| QNX Version | Notes |
|-------------|-------|
| **QNX 7.1** | Ships an older Python; `ensurepip` may need to be invoked without `--upgrade` on first run. Verify Python version with `python --version`. |
| **QNX 8.0** | `python -m ensurepip --upgrade` is the recommended bootstrap path. The `~/.local` user install layout is the default. |

> If you can specify your exact QNX version and the target Python package,
> exact target-specific build steps or dependency requirements can be provided.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ifconfig: no such interface` | Confirm the interface name with `ifconfig -a` or `nicinfo`. |
| `netmask: invalid argument` | Ensure the mask is in dotted-quad form (e.g. `255.255.255.0`). |
| `pip: command not found` | Use `python -m pip` instead, or re-run the `export PATH` step. |
| `No module named ensurepip` | Your Python build lacks the bundled bootstrapper; install `pip` via `pkg`/`python-pip` on QNX, or use a virtualenv (`python -m venv`). |
| Permission denied on install | Prefer the user install path (`~/.local`); do not write into system site-packages. |
