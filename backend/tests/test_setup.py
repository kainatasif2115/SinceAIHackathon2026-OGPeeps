from django.test import Client

from assistant import simset


def test_health_endpoint():
    response = Client().get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["simset_version"] == "2.0.1"
    assert body["guidance_passages"] == 55


def test_simset_data_loads():
    actions = simset.load_reference("action_vocabulary.json")["actions"]

    assert "no_action_needed" in actions
    assert len(simset.load_jsonl(simset.DEV_CASES)) == 588
    assert len(simset.load_jsonl(simset.TEST_INPUTS)) == 335


def test_dsakit_text_checks_are_available():
    # The same heuristics the organisers' evaluator uses on our answers.
    assert "dont_open_link" in simset.textcheck.find_steps("Do not open the link.")
    assert simset.textcheck.find_unsafe("Do not share the code with anyone.") == []
