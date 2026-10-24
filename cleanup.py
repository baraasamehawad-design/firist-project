import shutil
import os

targets = [
    "node_modules",
    "prisma/dev.db",
    "prisma/dev.db-journal",
    "dist",
]

for target in targets:
    if os.path.isdir(target):
        shutil.rmtree(target)
        print(f"[DELETED]  folder → {target}")
    elif os.path.isfile(target):
        os.remove(target)
        print(f"[DELETED]  file   → {target}")
    else:
        print(f"[SKIPPED]  not found → {target}")

print("\nCleanup complete. Safe to upload to GitHub.")
