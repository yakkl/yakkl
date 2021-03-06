from argparse import ArgumentParser
from typing import Any

from zerver.lib.management import YakklBaseCommand
from zilencer.models import RemoteYakklServer

class Command(YakklBaseCommand):
    help = """Add a remote Yakkl server for push notifications."""

    def add_arguments(self, parser: ArgumentParser) -> None:
        group = parser.add_argument_group("command-specific arguments")
        group.add_argument('uuid', help="the user's `yakkl_org_id`")
        group.add_argument('key', help="the user's `yakkl_org_key`")
        group.add_argument('--hostname', '-n', required=True,
                           help="the hostname, for human identification")
        group.add_argument('--email', '-e', required=True,
                           help="a contact email address")

    def handle(self, uuid: str, key: str, hostname: str, email: str,
               **options: Any) -> None:
        RemoteYakklServer.objects.create(uuid=uuid,
                                         api_key=key,
                                         hostname=hostname,
                                         contact_email=email)
