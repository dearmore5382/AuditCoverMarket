"""Fetch publisher evidence; derive article/section bytes with the exact contract helpers.
This is fixture acquisition, not a claim that GenVM or live validators passed.
"""
import ast
import hashlib
import html
import json
from pathlib import Path
import re
import urllib.request
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
tree = ast.parse((ROOT / 'contracts/AuditCoverMarket.py').read_text())
names = {'_text', '_article', '_section', '_digest'}
nodes = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in names]
env = dict(re=re, html=html, hashlib=hashlib, MAX_SOURCE_BYTES=600000, SOURCES={
    'oz-bravo': {'url': 'https://www.openzeppelin.com/news/compound-governor-bravo-audit', 'subject': 'Compound Governor Bravo Audit', 'commit': 'f86c247f6f81e14f8e0fd78402653a0b8371266a'},
    'oz-compound': {'url': 'https://www.openzeppelin.com/news/compound-comprehensive-protocol-audit', 'subject': 'Compound Comprehensive Protocol Audit', 'commit': ''}})
exec(compile(ast.Module(body=nodes, type_ignores=[]), '<contract acquisition helpers>', 'exec'), env)
fixture = ROOT / 'verification/source-cache'
fixture.mkdir(parents=True, exist_ok=True)
rows = []
for sid, source in env['SOURCES'].items():
    request = urllib.request.Request(source['url'], headers={'User-Agent': 'AuditCover-SourcePreflight/1.0'})
    with urllib.request.urlopen(request, timeout=40) as response:
        if response.geturl() != source['url'] or response.status != 200:
            raise RuntimeError('Source redirect/status mismatch')
        body = response.read(600001)
        headers = dict(response.headers)
    article, text = env['_article'](body, sid)
    second_request = urllib.request.Request(source['url'], headers={'User-Agent': 'AuditCover-SourcePreflight/1.0'})
    with urllib.request.urlopen(second_request, timeout=40) as response:
        if response.geturl() != source['url']:
            raise RuntimeError('Repeated fetch redirected')
        _, second_text = env['_article'](response.read(600001), sid)
    if text != second_text:
        raise RuntimeError('Normalized article unstable across consecutive public fetches')
    (fixture / (sid + '.html')).write_bytes(body)
    (fixture / (sid + '.article.txt')).write_text(text, encoding='utf8')
    findings = re.findall(r'\[([CMLNH][0-9]{2})\]', text)
    sections = {}
    for finding in dict.fromkeys(findings):
        try:
            sections[finding] = env['_section'](article, finding)
        except ValueError:
            continue
    (fixture / (sid + '.sections.json')).write_text(json.dumps(sections, indent=2, ensure_ascii=False), encoding='utf8')
    rows.append({'resource_id': sid, 'purpose': 'positive and cross-object controls', 'authoritative_owner': 'OpenZeppelin Security', 'publisher_controller': 'OpenZeppelin, separate from sponsor and curators', 'positive_state_beneficiary': 'winning curator', 'can_beneficiary_manufacture_fact_alone': False, 'canonical_origin': 'https://www.openzeppelin.com', 'canonical_url_or_api': source['url'], 'repository_and_object_id': source['subject'], 'revision_or_commit': source['commit'] or 'report article snapshot; no complete Git snapshot claim', 'expected_content_type': 'text/html', 'expected_digest_algorithm': 'SHA-256 over contract-normalized article UTF-8', 'expected_digest': env['_digest'](text), 'raw_body_sha256': hashlib.sha256(body).hexdigest(), 'mutable_or_immutable': 'mutable publisher page; pinned normalized-content commitment', 'availability_checked_at': datetime.now(timezone.utc).isoformat(), 'repeated_fetch_stable': True, 'finding_ids': list(sections), 'what_this_source_cannot_prove': 'Current deployed safety, successful fixes, runtime behavior, or curator authorship of findings', 'expected_deterministic_facts': ['exact compiled source ID and subject', 'article digest match', 'unique finding boundary'], 'expected_contract_result': 'Only genuine semantic coverage may enter minimum-cost clearing; other findings map to empty coverage'})
    print(sid, rows[-1]['expected_digest'], len(sections), 'findings')
(ROOT / 'samples').mkdir(exist_ok=True)
(ROOT / 'samples/resources.json').write_text(json.dumps(rows, indent=2), encoding='utf8')
# Expected mappings are selected from the publisher finding headings before AI execution.
(ROOT / 'samples/questions.json').write_text(json.dumps(['Find a published finding explaining repeated initialization of Governor Bravo.', 'Find a published finding explaining missing validation of governance parameters.'], indent=2), encoding='utf8')
