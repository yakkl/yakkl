#!/usr/bin/env python3

def generate_yakkl_bots_static_files() -> None:
    import glob
    import os
    import sys
    import shutil

    YAKKL_PATH = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    if YAKKL_PATH not in sys.path:
        sys.path.append(YAKKL_PATH)

    from typing import List
    from yakkl_bots.lib import get_bots_directory_path

    bots_dir = 'static/generated/bots'
    if os.path.isdir(bots_dir):
        # delete old static files, they could be outdated
        try:
            shutil.rmtree(bots_dir)
        except OSError:
            print("There was a permission error with Vagrant's NFS file      sharing on old versions of " +
                  "OSX. You can fix this by upgrading to the latest OSX High Sierra, or work around it " +
                  "by giving read/write permissions to your /yakkl folder to everyone.")
            sys.exit(1)

    os.makedirs(bots_dir, exist_ok=True)

    def copyfiles(paths):
        # type: (List[str]) -> None
        for src_path in paths:
            bot_name = os.path.basename(os.path.dirname(src_path))

            bot_dir = os.path.join(bots_dir, bot_name)
            os.makedirs(bot_dir, exist_ok=True)

            dst_path = os.path.join(bot_dir, os.path.basename(src_path))
            if not os.path.isfile(dst_path):
                shutil.copyfile(src_path, dst_path)

    package_bots_dir = get_bots_directory_path()

    logo_glob_pattern = os.path.join(package_bots_dir, '*/logo.*')
    logos = glob.glob(logo_glob_pattern)
    copyfiles(logos)

    doc_glob_pattern = os.path.join(package_bots_dir, '*/doc.md')
    docs = glob.glob(doc_glob_pattern)
    copyfiles(docs)

if __name__ == "__main__":
    generate_yakkl_bots_static_files()