#!/bin/bash
# Re-apply reverse proxy snippets if Plesk regenerates nginx.conf (e.g. httpdmng --reconfigure-domain).
# Run as root on the VPS.

set -euo pipefail

PROXY_BODY='proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;'

write_vhost() {
  local path="$1" port="$2"
  umask 027
  {
    echo "location / {"
    echo "    $PROXY_BODY"
    echo "    proxy_pass http://127.0.0.1:${port};"
    echo "}"
  } > "$path"
  chown root:nginx "$path"
  chmod 640 "$path"
}

write_vhost /var/www/vhosts/system/tramelle.com/conf/vhost_nginx.conf 3000
write_vhost /var/www/vhosts/system/api.tramelle.com/conf/vhost_nginx.conf 9000
write_vhost /var/www/vhosts/system/vendor.tramelle.com/conf/vhost_nginx.conf 5173
write_vhost /var/www/vhosts/system/manage.tramelle.com/conf/vhost_nginx.conf 7000

python3 << 'PY'
import pathlib

def inject_include(conf_path: str):
    p = pathlib.Path(conf_path)
    text = p.read_text()
    host_dir = p.parent.parent.name
    inc = f'\tinclude "/var/www/vhosts/system/{host_dir}/conf/vhost_nginx.conf";\n'
    if 'vhost_nginx.conf' in text:
        print(f"include likely present: {conf_path}")
        return
    needle = "\tadd_header X-Powered-By PleskLin;\n\n}"
    if needle not in text:
        raise SystemExit(f"add_header block not found: {conf_path}")
    text = text.replace(needle, inc + "\n" + needle, 1)
    p.write_text(text)
    print(f"patched: {conf_path}")

for sub in ("api.tramelle.com", "vendor.tramelle.com", "manage.tramelle.com"):
    inject_include(f"/var/www/vhosts/system/{sub}/conf/nginx.conf")
PY

nginx -t
systemctl reload nginx
echo "Done."
