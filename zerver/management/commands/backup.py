import os
import re
import tempfile
from argparse import ArgumentParser, RawTextHelpFormatter
from typing import Any

from django.conf import settings
from django.db import connection
from django.utils.timezone import now as timezone_now

from scripts.lib.yakkl_tools import parse_lsb_release, run, TIMESTAMP_FORMAT
from version import YAKKL_VERSION
from zerver.lib.management import YakklBaseCommand
from zerver.logging_handlers import try_git_describe


class Command(YakklBaseCommand):
    # Fix support for multi-line usage strings
    def create_parser(self, *args: Any, **kwargs: Any) -> ArgumentParser:
        parser = super().create_parser(*args, **kwargs)
        parser.formatter_class = RawTextHelpFormatter
        return parser

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument(
            "--output", default=None, nargs="?", help="Filename of output tarball"
        )
        parser.add_argument("--skip-db", action='store_true', help="Skip database backup")
        parser.add_argument("--skip-uploads", action='store_true', help="Skip uploads backup")

    def handle(self, *args: Any, **options: Any) -> None:
        timestamp = timezone_now().strftime(TIMESTAMP_FORMAT)
        with tempfile.TemporaryDirectory(
            prefix="yakkl-backup-%s-" % (timestamp,)
        ) as tmp:
            os.mkdir(os.path.join(tmp, "yakkl-backup"))
            members = []
            paths = []

            with open(os.path.join(tmp, "yakkl-backup", "yakkl-version"), "w") as f:
                print(YAKKL_VERSION, file=f)
                git = try_git_describe()
                if git:
                    print(git, file=f)
            members.append("yakkl-backup/yakkl-version")

            with open(os.path.join(tmp, "yakkl-backup", "os-version"), "w") as f:
                print(
                    "{DISTRIB_ID} {DISTRIB_CODENAME}".format(**parse_lsb_release()),
                    file=f,
                )
            members.append("yakkl-backup/os-version")

            with open(os.path.join(tmp, "yakkl-backup", "postgres-version"), "w") as f:
                print(connection.pg_version, file=f)
            members.append("yakkl-backup/postgres-version")

            if settings.DEVELOPMENT:
                members.append(
                    os.path.join(settings.DEPLOY_ROOT, "zproject", "dev-secrets.conf")
                )
                paths.append(
                    ("zproject", os.path.join(settings.DEPLOY_ROOT, "zproject"))
                )
            else:
                members.append("/etc/yakkl")
                paths.append(("settings", "/etc/yakkl"))

            if not options['skip_db']:
                db_name = settings.DATABASES["default"]["NAME"]
                db_dir = os.path.join(tmp, "yakkl-backup", "database")
                run(
                    ["pg_dump", "--format=directory", "--file", db_dir, "--", db_name],
                    cwd=tmp,
                )
                members.append("yakkl-backup/database")

            if not options['skip_uploads'] and settings.LOCAL_UPLOADS_DIR is not None and os.path.exists(
                os.path.join(settings.DEPLOY_ROOT, settings.LOCAL_UPLOADS_DIR)
            ):
                members.append(
                    os.path.join(settings.DEPLOY_ROOT, settings.LOCAL_UPLOADS_DIR)
                )
                paths.append(
                    (
                        "uploads",
                        os.path.join(settings.DEPLOY_ROOT, settings.LOCAL_UPLOADS_DIR),
                    )
                )

            assert not any("|" in name or "|" in path for name, path in paths)
            transform_args = [
                r"--transform=s|^{}(/.*)?$|yakkl-backup/{}\1|x".format(
                    re.escape(path), name.replace("\\", r"\\")
                )
                for name, path in paths
            ]

            try:
                if options["output"] is None:
                    tarball_path = tempfile.NamedTemporaryFile(
                        prefix="yakkl-backup-%s-" % (timestamp,),
                        suffix=".tar.gz",
                        delete=False,
                    ).name
                else:
                    tarball_path = options["output"]

                run(
                    ["tar", "-C", tmp, "-cPzf", tarball_path]
                    + transform_args
                    + ["--"]
                    + members
                )
                print("Backup tarball written to %s" % (tarball_path,))
            except BaseException:
                if options["output"] is None:
                    os.unlink(tarball_path)
                raise
