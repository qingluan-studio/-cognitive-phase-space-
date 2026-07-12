import sys
sys.path.insert(0, '/workspace/src')

import json
import pytest
from unittest.mock import patch, MagicMock, PropertyMock
from io import StringIO


class TestLearnCLI:
    """Tests for the learn() function with its subcommands."""

    @patch('sys.argv', ['cee-learn', 'toggle'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_toggle_default_state(self, mock_stdout):
        from cee.core.cli import learn
        from cee.app.engine.context_memory import get_global_context

        cm = get_global_context("default")
        learn()
        output = json.loads(mock_stdout.getvalue().strip())
        assert output["session_id"] == "default"
        assert "auto_learn_enabled" in output

    @patch('sys.argv', ['cee-learn', 'toggle', 'custom_session', 'on'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_toggle_enable(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = json.loads(mock_stdout.getvalue().strip())
        assert output["session_id"] == "custom_session"
        assert output["auto_learn_enabled"] is True

    @patch('sys.argv', ['cee-learn', 'toggle', 'custom_session', 'off'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_toggle_disable(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = json.loads(mock_stdout.getvalue().strip())
        assert output["session_id"] == "custom_session"
        assert output["auto_learn_enabled"] is False

    @patch('sys.argv', ['cee-learn', 'toggle', 'custom_session', 'true'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_toggle_true_string(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = json.loads(mock_stdout.getvalue().strip())
        assert output["auto_learn_enabled"] is True

    @patch('sys.argv', ['cee-learn', 'toggle', 'custom_session', '1'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_toggle_true_number(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = json.loads(mock_stdout.getvalue().strip())
        assert output["auto_learn_enabled"] is True

    @patch('sys.argv', ['cee-learn', 'toggle', 'custom_session', 'yes'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_toggle_true_yes(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = json.loads(mock_stdout.getvalue().strip())
        assert output["auto_learn_enabled"] is True

    @patch('sys.argv', ['cee-learn', 'stats'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_stats_default(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = json.loads(mock_stdout.getvalue().strip())
        assert "session_id" in output
        assert "auto_learn" in output
        assert "memory" in output
        assert "knowledge_graph" in output
        assert "user_profile" in output

    @patch('sys.argv', ['cee-learn', 'stats', 'my_session'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_stats_custom_session(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = json.loads(mock_stdout.getvalue().strip())
        assert output["session_id"] == "my_session"

    @patch('sys.argv', ['cee-learn', 'recall'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_recall_empty_query(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = mock_stdout.getvalue().strip()
        assert "\u67e5\u8be2:" in output

    @patch('sys.argv', ['cee-learn', 'recall', 'my_session', 'Python', 'testing'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_recall_with_query(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = mock_stdout.getvalue().strip()
        assert "Python testing" in output

    @patch('sys.argv', ['cee-learn', 'recall', 'my_session'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_recall_session_no_query(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = mock_stdout.getvalue().strip()
        assert "\u67e5\u8be2:" in output

    @patch('sys.argv', ['cee-learn', 'config'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_config_default(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = json.loads(mock_stdout.getvalue().strip())
        assert isinstance(output, dict)
        assert "auto_learn_enabled" in output

    @patch('sys.argv', ['cee-learn', 'config', 'my_session', 'auto_learn_enabled=true', 'max_context_facts=10'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_config_with_updates(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = json.loads(mock_stdout.getvalue().strip())
        assert "auto_learn_enabled" in output

    @patch('sys.argv', ['cee-learn', 'config', 'my_session', 'auto_learn_enabled=off', 'learn_from_user=false'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_config_bool_false_strings(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = json.loads(mock_stdout.getvalue().strip())
        assert isinstance(output, dict)

    @patch('sys.argv', ['cee-learn', 'config', 'my_session', 'threshold=0.75'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_config_float_value(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = json.loads(mock_stdout.getvalue().strip())
        assert isinstance(output, dict)

    @patch('sys.argv', ['cee-learn', 'config', 'my_session', 'name=custom_value'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_config_string_value(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = json.loads(mock_stdout.getvalue().strip())
        assert isinstance(output, dict)

    @patch('sys.argv', ['cee-learn', 'feedback'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_feedback_subcommand(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = json.loads(mock_stdout.getvalue().strip())
        assert isinstance(output, dict)

    @patch('sys.argv', ['cee-learn', 'analyze'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_analyze_subcommand(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = mock_stdout.getvalue().strip()
        assert len(output) > 0

    @patch('sys.argv', ['cee-learn', 'tune'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_tune_subcommand(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = json.loads(mock_stdout.getvalue().strip())
        assert isinstance(output, list)
        for item in output:
            assert "params" in item
            assert "score" in item

    @patch('sys.argv', ['cee-learn'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_learn_no_subcommand(self, mock_stdout):
        from cee.core.cli import learn
        learn()
        output = mock_stdout.getvalue().strip()
        assert "Usage" in output

    @patch('sys.argv', ['cee-learn', 'unknown_cmd'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_learn_unknown_subcommand(self, mock_stdout):
        from cee.core.cli import learn
        learn()


class TestEvaluate:
    """Tests for the evaluate() function."""

    @patch('sys.argv', ['cee-evaluate', 'test text for evaluation'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_evaluate_with_text(self, mock_stdout):
        from cee.core.cli import evaluate
        evaluate()
        output = json.loads(mock_stdout.getvalue().strip())
        scores = output.get("scores", output)
        assert "itc" in scores
        assert "scs" in scores
        assert "iec" in scores
        assert "pfft" in scores
        assert "composite" in scores
        assert "tier" in scores

    @patch('sys.argv', ['cee-evaluate', '-h'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_evaluate_help(self, mock_stdout):
        from cee.core.cli import evaluate
        evaluate()
        output = mock_stdout.getvalue().strip()
        assert "cee-evaluate" in output

    @patch('sys.argv', ['cee-evaluate', '--help'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_evaluate_double_dash_help(self, mock_stdout):
        from cee.core.cli import evaluate
        evaluate()
        output = mock_stdout.getvalue().strip()
        assert "cee-evaluate" in output

    @patch('sys.argv', ['cee-evaluate'])
    @patch('sys.stdin', new_callable=StringIO, create=True)
    @patch('sys.stdout', new_callable=StringIO)
    def test_evaluate_stdin(self, stdout_mock, stdin_mock):
        stdin_mock.write('stdin input text for evaluation')
        stdin_mock.seek(0)
        from cee.core.cli import evaluate
        evaluate()
        output = json.loads(stdout_mock.getvalue().strip())
        scores = output.get("scores", output)
        assert "composite" in scores


class TestBenchmark:
    """Tests for the benchmark() function."""

    @patch('sys.stdout', new_callable=StringIO)
    def test_benchmark_output(self, mock_stdout):
        from cee.core.cli import benchmark
        benchmark()
        output = mock_stdout.getvalue().strip()
        assert "CEE T6 Invariant Engine" in output
        assert "Benchmark" in output
        assert "ITC" in output
        assert "SCS" in output
        assert "IEC" in output
        assert "PFFT" in output
        assert "Composite" in output
        assert "Summary" in output
        assert "Mean" in output
        assert "high_quality" in output
        assert "medium_quality" in output
        assert "low_quality" in output
        assert "chinese_sample" in output


class TestAgent:
    """Tests for the agent() function."""

    @patch('sys.argv', ['cee-agent'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_agent_no_args(self, mock_stdout):
        from cee.core.cli import agent
        agent()
        output = mock_stdout.getvalue().strip()
        assert "Usage" in output

    @patch('sys.argv', ['cee-agent', 'list'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_agent_list_unknown(self, mock_stdout):
        from cee.core.cli import agent
        agent()

    @patch('sys.argv', ['cee-agent', 'run'])
    @patch('sys.stderr', new_callable=StringIO)
    def test_agent_run_no_goal(self, mock_stderr):
        from cee.core.cli import agent
        agent()
        output = mock_stderr.getvalue().strip()
        assert "--goal required" in output

    @patch('sys.argv', ['cee-agent', 'run', '--goal', 'Write a test module',
                        '--roles', 'coder,reviewer'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_agent_run_with_roles(self, mock_stdout):
        from cee.core.cli import agent
        agent()
        output = json.loads(mock_stdout.getvalue().strip())
        assert isinstance(output, dict)

    @patch('sys.argv', ['cee-agent', 'run', '--goal', 'Write documentation'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_agent_run_default_roles(self, mock_stdout):
        from cee.core.cli import agent
        agent()
        output = json.loads(mock_stdout.getvalue().strip())
        assert isinstance(output, dict)

    @patch('sys.argv', ['cee-agent', 'status'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_agent_status(self, mock_stdout):
        from cee.core.cli import agent
        agent()
        output = json.loads(mock_stdout.getvalue().strip())
        assert isinstance(output, dict)


class TestKnowledge:
    """Tests for the knowledge() function."""

    @patch('sys.argv', ['cee-knowledge'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_knowledge_no_args(self, mock_stdout):
        from cee.core.cli import knowledge
        knowledge()
        output = mock_stdout.getvalue().strip()
        assert "Usage" in output

    @patch('sys.argv', ['cee-knowledge', 'learn', 'test fact about AI'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_knowledge_learn(self, mock_stdout):
        from cee.core.cli import knowledge
        knowledge()
        output = mock_stdout.getvalue().strip()
        assert "Learned:" in output

    @patch('sys.argv', ['cee-knowledge', 'learn'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_knowledge_learn_default(self, mock_stdout):
        from cee.core.cli import knowledge
        knowledge()
        output = mock_stdout.getvalue().strip()
        assert "Learned:" in output

    @patch('sys.argv', ['cee-knowledge', 'query', 'Python'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_knowledge_query(self, mock_stdout):
        from cee.core.cli import knowledge
        knowledge()
        output = mock_stdout.getvalue().strip()
        assert output == "" or "\u7f6e\u4fe1\u5ea6" in output

    @patch('sys.argv', ['cee-knowledge', 'query'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_knowledge_query_default(self, mock_stdout):
        from cee.core.cli import knowledge
        knowledge()
        output = mock_stdout.getvalue().strip()

    @patch('sys.argv', ['cee-knowledge', 'synthesize', '--topic=cognition', 'info piece 1', 'info piece 2'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_knowledge_synthesize(self, mock_stdout):
        from cee.core.cli import knowledge
        knowledge()
        output = mock_stdout.getvalue().strip()
        assert "\u65b0\u77e5:" in output

    @patch('sys.argv', ['cee-knowledge', 'synthesize'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_knowledge_synthesize_default(self, mock_stdout):
        from cee.core.cli import knowledge
        knowledge()
        output = mock_stdout.getvalue().strip()
        assert "\u65b0\u77e5:" in output

    @patch('sys.argv', ['cee-knowledge', 'stats'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_knowledge_stats(self, mock_stdout):
        from cee.core.cli import knowledge
        knowledge()
        output = json.loads(mock_stdout.getvalue().strip())
        assert isinstance(output, dict)

    @patch('sys.argv', ['cee-knowledge', 'unknown_cmd'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_knowledge_unknown(self, mock_stdout):
        from cee.core.cli import knowledge
        knowledge()
        output = json.loads(mock_stdout.getvalue().strip())
        assert isinstance(output, dict)


class TestMemoryCLI:
    """Tests for the memory_cli() function."""

    @patch('sys.argv', ['cee-memory'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_memory_no_args(self, mock_stdout):
        from cee.core.cli import memory_cli
        memory_cli()
        output = mock_stdout.getvalue().strip()
        assert "Usage" in output

    @patch('sys.argv', ['cee-memory', 'remember', '--text=test memory content', '--type=fact'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_memory_remember(self, mock_stdout):
        from cee.core.cli import memory_cli
        memory_cli()
        output = mock_stdout.getvalue().strip()
        assert "\u5df2\u8bb0\u5fc6" in output or "memory_id" in output

    @patch('sys.argv', ['cee-memory', 'remember'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_memory_remember_no_text(self, mock_stdout):
        from cee.core.cli import memory_cli
        memory_cli()
        output = mock_stdout.getvalue().strip()

    @patch('sys.argv', ['cee-memory', 'recall', '--query=test'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_memory_recall(self, mock_stdout):
        from cee.core.cli import memory_cli
        memory_cli()
        output = mock_stdout.getvalue().strip()

    @patch('sys.argv', ['cee-memory', 'recall'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_memory_recall_no_query(self, mock_stdout):
        from cee.core.cli import memory_cli
        memory_cli()
        output = mock_stdout.getvalue().strip()

    @patch('sys.argv', ['cee-memory', 'stats'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_memory_stats(self, mock_stdout):
        from cee.core.cli import memory_cli
        memory_cli()
        output = json.loads(mock_stdout.getvalue().strip())
        assert isinstance(output, dict)


class TestOutput:
    """Tests for the output() function."""

    @patch('sys.argv', ['cee-output'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_output_no_args(self, mock_stdout):
        from cee.core.cli import output
        output()
        output_contents = mock_stdout.getvalue().strip()
        assert "Usage" in output_contents

    @patch('sys.argv', ['cee-output', 'format', '--text=Hello world', '--style=concise'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_output_format_with_text(self, mock_stdout):
        from cee.core.cli import output
        output()
        output_contents = mock_stdout.getvalue().strip()
        assert len(output_contents) > 0

    @patch('sys.argv', ['cee-output', 'format', '--text=Hello, CEE!'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_output_format_no_style(self, mock_stdout):
        from cee.core.cli import output
        output()
        output_contents = mock_stdout.getvalue().strip()
        assert len(output_contents) > 0

    @patch('sys.argv', ['cee-output', 'save', '--text=Saved content', '--file=test_output.txt'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_output_save_with_file(self, mock_stdout):
        from cee.core.cli import output
        output()
        output_contents = mock_stdout.getvalue().strip()
        assert "\u5df2\u4fdd\u5b58:" in output_contents or "saved_to" in output_contents

    @patch('sys.argv', ['cee-output', 'save', '--text=Saved text'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_output_save_default_file(self, mock_stdout):
        from cee.core.cli import output
        output()
        output_contents = mock_stdout.getvalue().strip()
        assert "\u5df2\u4fdd\u5b58:" in output_contents or "saved_to" in output_contents

    @patch('sys.argv', ['cee-output', 'copy', 'plain text content'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_output_copy(self, mock_stdout):
        from cee.core.cli import output
        output()
        output_contents = mock_stdout.getvalue().strip()
        assert "plain text content" in output_contents

    @patch('sys.argv', ['cee-output', 'copy'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_output_copy_default(self, mock_stdout):
        from cee.core.cli import output
        output()
        output_contents = mock_stdout.getvalue().strip()
        assert "Copy me!" in output_contents

    @patch('sys.argv', ['cee-output', 'stats'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_output_stats(self, mock_stdout):
        from cee.core.cli import output
        output()
        output_contents = json.loads(mock_stdout.getvalue().strip())
        assert isinstance(output_contents, dict)

    @patch('sys.argv', ['cee-output', 'unknown_cmd'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_output_unknown(self, mock_stdout):
        from cee.core.cli import output
        output()
        output_contents = json.loads(mock_stdout.getvalue().strip())
        assert isinstance(output_contents, dict)
