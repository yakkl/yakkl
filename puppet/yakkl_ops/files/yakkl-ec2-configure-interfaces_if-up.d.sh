#! /bin/sh
# Run yakkl-ec2-configure-interfaces when eth0 is brought up

set -e

# Only run from ifup.
if [ "$MODE" != start ]; then
	exit 0
fi

if [ "$IFACE" = eth0 ]; then
	/usr/local/sbin/yakkl-ec2-configure-interfaces
fi
