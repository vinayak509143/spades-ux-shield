"""Sample hosts from third-party-rules.txt for demo suggestions."""
from collections import Counter
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "third-party-rules.txt"
hosts: Counter[str] = Counter()
demo = {
    "bbc.co.uk",
    "theguardian.com",
    "reddit.com",
    "stackoverflow.com",
    "medium.com",
    "nytimes.com",
    "wikipedia.org",
    "cnn.com",
    "forbes.com",
    "flipkart.com",
    "ebay.com",
    "indiatimes.com",
    "timesofindia.indiatimes.com",
    "cookiebot.com",
    "consent.yahoo.com",
}

with path.open(encoding="utf-8", errors="replace") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("!") or line.startswith("[") or "##" not in line:
            continue
        host_part = line.split("##", 1)[0].strip()
        for h in host_part.split(","):
            h = h.strip().lower()
            if h and not h.startswith("~"):
                hosts[h] += 1

print("Total unique hosts:", len(hosts))
print("Total rules (host lines):", sum(hosts.values()))
print("\nTop 25 hosts by rule count:")
for h, c in hosts.most_common(25):
    print(f"  {c:4d}  {h}")

print("\nDemo sites in list:")
for h in sorted(demo):
    c = hosts.get(h, 0)
    if c:
        print(f"  {h}: {c} rules")

print("\nSample mid-tier news/sites (5-50 rules):")
mid = [(h, c) for h, c in hosts.items() if 5 <= c <= 50 and "." in h]
mid.sort(key=lambda x: -x[1])
for h, c in mid[:20]:
    print(f"  {c:4d}  {h}")
