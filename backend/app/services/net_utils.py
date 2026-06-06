"""网络工具 — 系统 DNS 不稳定时回退公共 DNS 解析。"""

import logging
import shutil
import socket
import subprocess

logger = logging.getLogger(__name__)

_PUBLIC_DNS = ("223.5.5.5", "119.29.29.29", "8.8.8.8")


def resolve_ipv4(host: str) -> str:
    """解析域名 IPv4；系统 DNS 失败时尝试 dig @公共 DNS。"""
    try:
        return socket.getaddrinfo(host, 443, socket.AF_INET, socket.SOCK_STREAM)[0][4][0]
    except OSError as exc:
        logger.warning("系统 DNS 解析 %s 失败: %s，尝试公共 DNS", host, exc)

    dig = shutil.which("dig")
    if dig:
        for ns in _PUBLIC_DNS:
            try:
                proc = subprocess.run(
                    [dig, f"@{ns}", "+short", host, "A"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    check=False,
                )
                for line in proc.stdout.splitlines():
                    candidate = line.strip().rstrip(".")
                    if candidate and candidate[0].isdigit() and "." in candidate:
                        logger.info("公共 DNS %s 解析 %s -> %s", ns, host, candidate)
                        return candidate
            except Exception as dig_exc:
                logger.debug("dig @%s 失败: %s", ns, dig_exc)

    raise OSError(
        f"无法解析域名 {host}（Temporary failure in name resolution）。"
        "请检查网络 DNS，或在 /etc/resolv.conf 添加 nameserver 223.5.5.5"
    )
