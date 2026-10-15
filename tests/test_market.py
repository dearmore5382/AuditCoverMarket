from pathlib import Path
from unittest.mock import patch
import base64
import hashlib
import importlib
import json
import sys
import pytest
from gltest.direct import VMContext, create_address, deploy_contract

ROOT = Path(__file__).resolve().parents[1]
FILE = ROOT / 'contracts/AuditCoverMarket.py'


def eth(address):
    return '0x' + (address if isinstance(address, bytes) else address.as_bytes).hex()


@pytest.fixture
def market():
    sponsor, curator, stranger = [create_address(a) for a in ('sponsor', 'curator', 'stranger')]
    vm = VMContext(sponsor)
    vm.warp('2026-10-15T00:00:00Z')
    with patch('os.unlink', lambda _: None), vm.activate():
        contract = deploy_contract(FILE, vm)
        gl = contract._instance.create_round.__globals__['gl']
        _ = gl.nondet
        _ = gl.vm
        sdk = Path(gl._cached_gl.__file__).resolve().parents[2]
        assert sdk.name == '11rhn002yfajawsz7fai6mykznbxkxs6l91iskj5cm82c92qhy3v'
        sys.path.insert(0, str(sdk)) if str(sdk) not in sys.path else None
        importlib.import_module('genlayer')
        _ = gl.nondet.web
        _ = gl.eq_principle
    with vm.activate():
        sync(vm, contract)
        yield vm, contract, sponsor, curator, stranger


def sync(vm, c):
    gl = c._instance.create_round.__globals__['gl']
    sdk = str(Path(gl._cached_gl.__file__).resolve().parents[2])
    if sdk not in sys.path:
        sys.path.insert(0, sdk)
    if 'genlayer' not in sys.modules:
        importlib.import_module('genlayer')
    sender = type(gl.message.sender_address)(vm.sender) if isinstance(vm.sender, bytes) else vm.sender
    gl._cached_gl.message = gl.message._replace(sender_address=sender, origin_address=sender, value=type(gl.message.value)(vm.value))
    gl._cached_gl.message_raw['datetime'] = vm._datetime


def call(m, actor, method, *args, value=0):
    vm, c, *_ = m
    with vm.activate(), vm.prank(actor):
        vm.value = value
        sync(vm, c)
        return getattr(c, method)(*args)


def clock(m, iso):
    m[0].warp('2026-10-15T' + iso + 'Z')


def terms(m):
    mod = m[1]._instance.create_round.__globals__
    _, text = mod['_article']((ROOT / 'tests/fixtures/synthetic-bravo.html').read_bytes(), 'oz-bravo')
    return {'title': 'Governor Bravo research packet', 'questions': ['Find the repeated initialization risk.', 'Find the governance parameter validation issue.'], 'sources': {'oz-bravo': mod['_digest'](text)}, 'budget': 1000, 'commit_end': 1792023000, 'reveal_end': 1792023600, 'expires': 1792024200}


def setup_round(m):
    vm, c, s, *_ = m
    t = terms(m)
    from datetime import datetime
    for k, iso in [('commit_end', '00:10:00'), ('reveal_end', '00:20:00'), ('expires', '00:30:00')]:
        t[k] = int(datetime.fromisoformat('2026-10-15T' + iso + '+00:00').timestamp())
    rid = call(m, s, 'create_round', json.dumps(t))
    assert call(m, s, 'fund_round', rid, value=1000) == 'FUNDED'
    vm.deal(vm._contract_address, 1000)  # Direct Mode does not simulate transaction funding.
    return rid


def bid(m, rid, actor, source='oz-bravo', finding='L02', price=300):
    c = m[1]
    mod = c._instance.create_round.__globals__
    payload = dict(source_id=source, finding=finding, price=price)
    salt = ('sample-salt-' + finding + '-for-test-only').ljust(40, 'x')
    digest = mod['_digest'](mod['_canonical'](['auditcover-bid-v1', c.get_round(rid)['terms_digest'], eth(actor), payload, salt]))
    index = call(m, actor, 'commit_bid', rid, digest)
    return index, payload, salt


def revealed(m):
    rid = setup_round(m)
    curator = m[3]
    b0 = bid(m, rid, curator, finding='L02', price=300)
    b1 = bid(m, rid, curator, finding='M01', price=200)
    clock(m, '00:10:00')
    for i, p, salt in (b0, b1):
        assert call(m, curator, 'reveal_bid', rid, i, json.dumps(p), salt) == 'REVEALED'
    clock(m, '00:20:00')
    return rid


def result():
    return {'status': 'RESOLVED', 'rows': [{'bid_id': 0, 'coverage': [0], 'quotes': ['x' * 20]}, {'bid_id': 1, 'coverage': [1], 'quotes': ['y' * 20]}]}


def judged(m):
    rid = revealed(m)
    mod = m[1]._instance.create_round.__globals__
    with patch.dict(mod, {'_judge': lambda *_: result()}):
        assert call(m, m[4], 'clear_round', rid) == 'CLEARED'
    return rid


def test_exact_runner_header():
    assert FILE.read_text().splitlines()[:2] == ['# v0.2.16', '# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }']


def test_clock_and_direct_constructor(market):
    assert market[1].get_config()['clock'] == '2026-10-15T00:00:00Z'
    assert market[1].get_config()['round_count'] == 0


def test_wrong_value_and_wrong_actor_no_mutation(market):
    m = market
    setup_round(m)
    before = m[1].get_round(0)
    for actor, amount in ((m[4], 1000), (m[2], 999), (m[2], 0)):
        with pytest.raises(Exception):
            call(m, actor, 'fund_round', 0, value=amount)
        assert m[1].get_round(0) == before


def test_question_and_source_bounds_reject_before_creation(market):
    for update in ({'questions': ['A sufficiently long question?'] * 5}, {'sources': {'fake-auditor': 'a' * 64}}, {'budget': 0}):
        t = terms(market)
        t.update(update)
        with pytest.raises(Exception):
            call(market, market[2], 'create_round', json.dumps(t))
        assert call(market, market[2], 'get_config')['round_count'] == 0


def test_commit_reveal_authority_quota_digest_and_exact_boundary(market):
    m = market
    rid = setup_round(m)
    b0 = bid(m, rid, m[3])
    before = m[1].get_round(rid)
    with pytest.raises(Exception):
        call(m, m[2], 'commit_bid', rid, 'b' * 64)
    with pytest.raises(Exception):
        call(m, m[3], 'reveal_bid', rid, b0[0], json.dumps(b0[1]), b0[2])
    assert m[1].get_round(rid) == before
    clock(m, '00:10:00')
    with pytest.raises(Exception):
        call(m, m[4], 'reveal_bid', rid, b0[0], json.dumps(b0[1]), b0[2])
    with pytest.raises(Exception):
        call(m, m[3], 'reveal_bid', rid, b0[0], json.dumps(dict(b0[1], price=1)), b0[2])
    assert m[1].get_round(rid) == before
    assert call(m, m[3], 'reveal_bid', rid, b0[0], json.dumps(b0[1]), b0[2]) == 'REVEALED'
    after = m[1].get_round(rid)
    with pytest.raises(Exception):
        call(m, m[3], 'reveal_bid', rid, b0[0], json.dumps(b0[1]), b0[2])
    assert m[1].get_round(rid) == after


def test_minimum_cover_clearing_reserved_credits_and_replay(market):
    rid = judged(market)
    c = market[1]
    value = c.get_round(rid)
    assert value['selected'] == [0, 1]
    assert value['credits'][eth(market[3])]['amount'] == 500
    assert value['credits'][eth(market[2])]['amount'] == 500
    clock(market, '00:31:00')
    for method in ('clear_round', 'recover_round'):
        with pytest.raises(Exception):
            call(market, market[2], method, rid)
        assert c.get_round(rid) == value


def test_solver_prices_duplicate_and_tie_break(market):
    f = market[1]._instance.create_round.__globals__['_best_cover']
    bids = [{'source_id': 'oz-bravo', 'finding': 'L02', 'price': 5}, {'source_id': 'oz-bravo', 'finding': 'M01', 'price': 5}, {'source_id': 'oz-bravo', 'finding': 'N01', 'price': 9}]
    rows = [{'coverage': [0]}, {'coverage': [1]}, {'coverage': [0, 1]}]
    assert f(bids, rows, 2, 10) == {'cost': 9, 'selected': [2]}
    assert f(bids, rows, 2, 8) is None
    bids[2]['price'] = 10
    assert f(bids, rows, 2, 10)['selected'] == [2]
    bids[2]['finding'] = 'L02'
    assert f(bids[:2], [{'coverage': [0]}, {'coverage': [0]}], 1, 10)['selected'] == [0]


@pytest.mark.parametrize('status', ['UNRESOLVED', 'NO_COVER'])
def test_unresolved_or_missing_coverage_no_privilege_recover_after_expiry(market, status):
    m = market
    rid = revealed(m)
    mod = m[1]._instance.create_round.__globals__
    output = {'status': 'UNRESOLVED', 'rows': []} if status == 'UNRESOLVED' else {'status': 'RESOLVED', 'rows': [{'bid_id': i, 'coverage': [], 'quotes': []} for i in range(2)]}
    with patch.dict(mod, {'_judge': lambda *_: output}):
        assert call(m, m[4], 'clear_round', rid) == status
    before = m[1].get_round(rid)
    assert before['credits'] == {} and before['held'] == 1000
    with pytest.raises(Exception):
        call(m, m[3], 'request_payout', rid)
    with pytest.raises(Exception):
        call(m, m[2], 'recover_round', rid)
    assert m[1].get_round(rid) == before
    clock(m, '00:30:00')
    assert call(m, m[4], 'recover_round', rid) == 'REFUND_AVAILABLE'
    recovered = m[1].get_round(rid)
    with pytest.raises(Exception):
        call(m, m[3], 'clear_round', rid)
    assert m[1].get_round(rid) == recovered


def test_payout_emission_pending_never_pretends_received(market):
    m = market
    rid = judged(m)
    assert call(m, m[3], 'request_payout', rid) == 'TRANSFER_PENDING'
    state = m[1].get_round(rid)
    assert state['paid'] == 0 and state['pending'] == 500 and state['held'] == 500
    assert state['credits'][eth(m[3])]['status'] == 'TRANSFER_PENDING'
    with pytest.raises(Exception):
        call(m, m[3], 'request_payout', rid)
    assert m[1].get_round(rid) == state


def test_emit_error_preserves_credit(market):
    rid = judged(market)
    before = market[1].get_round(rid)
    mod = market[1]._instance.create_round.__globals__
    def broken(_):
        raise RuntimeError('emission rejected')
    with patch.dict(mod, {'_Recipient': broken}), pytest.raises(Exception):
        call(market, market[3], 'request_payout', rid)
    assert market[1].get_round(rid) == before


def test_synthetic_http_source_digest_binding_and_wrong_finding(market):
    m = market
    mod = m[1]._instance.create_round.__globals__
    body = (ROOT / 'tests/fixtures/synthetic-bravo.html').read_bytes()
    article, text = mod['_article'](body, 'oz-bravo')
    digest = mod['_digest'](text)
    vm = m[0]
    vm.mock_web(r'^https://www\.openzeppelin\.com/news/compound-governor-bravo-audit$', {'method': 'GET', 'response': {'status': 200, 'headers': {'content-type': b'text/html'}, 'body': body}})
    with vm.activate(), patch.object(vm, '_in_nondet', True, create=True):
        assert mod['_fetch']('oz-bravo', digest) == article
        with pytest.raises(ValueError):
            mod['_fetch']('oz-bravo', '0' * 64)
        with pytest.raises(ValueError):
            mod['_section'](article, 'H99')
        with pytest.raises(Exception):
            mod['_fetch']('https://www.openzeppelin.com.attacker.test', digest)
    assert 'initialize' in mod['_section'](article, 'L02')


def test_actual_ai_boundary_and_validator_can_falsify_wrong_leader(market):
    m = market
    rid = revealed(m)
    mod = m[1]._instance.create_round.__globals__
    body = (ROOT / 'tests/fixtures/synthetic-bravo.html').read_bytes()
    article, text = mod['_article'](body, 'oz-bravo')
    m[0].mock_web(r'^https://www\.openzeppelin\.com/news/compound-governor-bravo-audit$', {'method': 'GET', 'response': {'status': 200, 'headers': {'content-type': b'text/html'}, 'body': body}})
    output = result()
    output['rows'][0]['quotes'] = [mod['_section'](article, 'L02')[:180]]
    output['rows'][1]['quotes'] = [mod['_section'](article, 'M01')[:180]]
    m[0].mock_llm('AUDITCOVER_COVERAGE_V1', json.dumps(output))
    assert call(m, m[4], 'clear_round', rid) == 'CLEARED'
    _, _, validator = m[0]._captured_validators[-1]
    gl = mod['gl']
    with m[0].activate(), patch.object(m[0], '_in_nondet', True, create=True):
        sync(m[0], m[1])
        current = m[1].get_round(rid)
        assert mod['_coverage'](current['terms'], current['bids']) == output
        assert validator(gl.vm.Return(output)) is True
        bad = json.loads(json.dumps(output))
        bad['rows'][0]['coverage'] = [1]
        assert validator(gl.vm.Return(bad)) is False


def test_missing_source_with_forced_positive_llm_cannot_clear(market):
    m = market
    rid = revealed(m)
    m[0].mock_web(r'^https://www\.openzeppelin\.com/news/compound-governor-bravo-audit$', {'status': 503, 'body': b'unavailable'})
    m[0].mock_llm('AUDITCOVER_COVERAGE_V1', json.dumps(result()))
    assert call(m, m[4], 'clear_round', rid) == 'UNRESOLVED'
    state = m[1].get_round(rid)
    assert state['credits'] == {} and state['paid'] == 0 and state['selected'] == []


def test_receipt_confirmation_exact_parent_child_and_replay(market):
    m = market
    rid = judged(m)
    call(m, m[3], 'request_payout', rid)
    mod = m[1]._instance.create_round.__globals__
    caddr = eth(m[0]._contract_address)
    recipient = eth(m[3])
    parent_hash, child_hash = '0x' + 'a' * 64, '0x' + 'b' * 64
    encoded = base64.b64encode(mod['calldata'].encode({'method': 'request_payout', 'args': [rid]})).decode()
    parent = {'hash': parent_hash, 'status': 'FINALIZED', 'to_address': caddr, 'from_address': recipient, 'data': {'calldata': encoded}, 'triggered_transactions': [child_hash]}
    child = {'hash': child_hash, 'status': 'FINALIZED', 'from_address': caddr, 'to_address': recipient, 'value': 500, 'type': 0, 'triggered_by': parent_hash, 'value_credited': True}
    def rpc(body):
        request = json.loads(body)
        return {'status': 200, 'body': json.dumps({'result': parent if request['params'][0] == parent_hash else child}).encode()}
    # Strict URL routing and actual contract receipt parser, not a mirror ledger.
    for altered in ('recipient', 'value', 'credited', 'round'):
        bad_parent, bad_child = json.loads(json.dumps(parent)), json.loads(json.dumps(child))
        if altered == 'recipient': bad_child['to_address'] = eth(m[4])
        if altered == 'value': bad_child['value'] = 499
        if altered == 'credited': bad_child['value_credited'] = False
        if altered == 'round': bad_parent['data']['calldata'] = base64.b64encode(mod['calldata'].encode({'method': 'request_payout', 'args': [rid + 1]})).decode()
        before = m[1].get_round(rid)
        with patch.dict(mod, {'_rpc_transaction': lambda h, p=bad_parent, c=bad_child: p if h == parent_hash else c}):
            with pytest.raises(Exception): call(m, m[4], 'confirm_payout', rid, recipient, parent_hash, child_hash)
        assert m[1].get_round(rid) == before
    with patch.dict(mod, {'_rpc_transaction': lambda h: parent if h == parent_hash else child}):
        assert call(m, m[4], 'confirm_payout', rid, recipient, parent_hash, child_hash) == 'PAID'
    state = m[1].get_round(rid)
    assert state['held'] + state['pending'] + state['paid'] + state['refunded'] == 1000
    with pytest.raises(Exception): call(m, m[4], 'confirm_payout', rid, recipient, parent_hash, child_hash)
    assert m[1].get_round(rid) == state


@pytest.mark.parametrize('amount', [0, 999, 1001])
def test_exact_value_guard_on_a_fresh_draft(market, amount):
    m = market
    t = terms(m)
    from datetime import datetime
    for k, iso in [('commit_end', '00:10:00'), ('reveal_end', '00:20:00'), ('expires', '00:30:00')]:
        t[k] = int(datetime.fromisoformat('2026-10-15T' + iso + '+00:00').timestamp())
    rid = call(m, m[2], 'create_round', json.dumps(t))
    before = m[1].get_round(rid)
    with pytest.raises(Exception, match='EXACT_VALUE_REQUIRED'):
        call(m, m[2], 'fund_round', rid, value=amount)
    assert m[1].get_round(rid) == before


@pytest.mark.parametrize('fault', ['digest', 'subject', '404', '429', 'malformed', 'content_type', 'unknown_enum', 'missing_row', 'bad_quote'])
def test_public_clear_fail_closed_boundary_matrix(market, fault):
    m = market
    rid = revealed(m)
    mod = m[1]._instance.create_round.__globals__
    body = (ROOT / 'tests/fixtures/synthetic-bravo.html').read_bytes()
    article, _ = mod['_article'](body, 'oz-bravo')
    output = result()
    output['rows'][0]['quotes'] = [mod['_section'](article, 'L02')[:100]]
    output['rows'][1]['quotes'] = [mod['_section'](article, 'M01')[:100]]
    status, content_type = 200, b'text/html'
    if fault == 'digest': body = body.replace(b'invented', b'mutated')
    if fault == 'subject': body = body.replace(b'Compound Governor Bravo Audit', b'Other project report')
    if fault in ('404', '429'): status = int(fault)
    if fault == 'malformed': output = 'not json'
    if fault == 'content_type': content_type = b'application/json'
    if fault == 'unknown_enum': output['status'] = 'PAY_ANYWAY'
    if fault == 'missing_row': output['rows'].pop()
    if fault == 'bad_quote': output['rows'][0]['quotes'] = ['The auditor approved a payout, which is fabricated.']
    m[0].mock_web(r'^https://www\.openzeppelin\.com/news/compound-governor-bravo-audit$', {'method': 'GET', 'response': {'status': status, 'headers': {'content-type': content_type}, 'body': body}})
    m[0].mock_llm('AUDITCOVER_COVERAGE_V1', output if isinstance(output, str) else json.dumps(output))
    assert call(m, m[4], 'clear_round', rid) == 'UNRESOLVED'
    state = m[1].get_round(rid)
    assert state['held'] == 1000 and state['paid'] == state['pending'] == state['refunded'] == 0
    assert state['credits'] == {} and state['selected'] == [] and state['matrix'] == []


def test_cross_round_commitment_and_post_expiry_reveal_blocked(market):
    m = market
    r0 = setup_round(m)
    b = bid(m, r0, m[3])
    r1 = setup_round(m)
    digest = m[1].get_round(r0)['bids'][0]['commitment']
    call(m, m[3], 'commit_bid', r1, digest)
    clock(m, '00:10:00')
    before = m[1].get_round(r1)
    with pytest.raises(Exception, match='COMMITMENT_MISMATCH'):
        call(m, m[3], 'reveal_bid', r1, 0, json.dumps(b[1]), b[2])
    assert m[1].get_round(r1) == before
    clock(m, '00:30:00')
    with pytest.raises(Exception, match='NOT_REVEAL_WINDOW'):
        call(m, m[3], 'reveal_bid', r1, 0, json.dumps(b[1]), b[2])
    assert m[1].get_round(r1) == before
