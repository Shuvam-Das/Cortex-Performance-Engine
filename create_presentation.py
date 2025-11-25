# create_presentation.py

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor

# --- Presentation Content ---
# Each dictionary in this list represents a slide.
slides_content = [
    {
        "title": "The Future of Resilience Engineering:\nAn Agentic Performance & Chaos Platform",
        "subtitle": "A Smart, Autonomous, and Cost-Optimized Testing Ecosystem on AWS",
        "notes": "Presented to: [Stakeholder Name/Team]\nDate: [Current Date]"
    },
    {
        "title": "Agenda",
        "points": [
            "The Problem: The High Cost of Traditional Performance Testing",
            "Our Vision: A Shift Towards Autonomous Resilience Engineering",
            "The Solution: The Agentic Performance & Chaos Platform",
            "Core Features & Advantages",
            "Architecture Deep Dive & Prototype in Action",
            "The Business Impact: Cost Savings & ROI",
            "Prerequisites & Next Steps",
            "Q&A"
        ]
    },
    {
        "title": "The Problem: The Old Way is Broken",
        "subtitle": "Traditional performance testing is slow, expensive, and disconnected from reality.",
        "table": {
            "headers": ["Challenge", "Description", "Impact"],
            "rows": [
                ["Manual Scripting", "Expert engineers spend weeks writing brittle JMeter/LoadRunner scripts.", "High Effort & Cost, Slow time-to-market."],
                ["Siloed Tools", "Performance results, server metrics, and chaos tests are in different systems.", "Incomplete Picture, Difficult to correlate cause and effect."],
                ["Static Environments", "Requires dedicated, always-on servers for test controllers and load generators.", "High Infrastructure Cost, Maintenance overhead."],
                ["Lack of Realism", "Tests are based on assumptions, not real user behavior.", "False Sense of Security, Production incidents still occur."]
            ]
        }
    },
    {
        "title": "Our Vision: A Smarter Approach",
        "points": [
            "To create a self-healing, intelligent platform that autonomously validates the performance and resilience of our applications.",
            "Driven by real production data.",
            "Controlled by natural language.",
            {"text": "Moving from manual testing to autonomous observation and experimentation.", "level": 1}
        ]
    },
    {
        "title": "The Solution: Agentic Performance & Chaos Platform",
        "subtitle": "A cloud-native, AI-driven platform that automates the entire resilience engineering lifecycle.",
        "points": [
            "A separate, independent platform that observes and tests the target application.",
            "Chatbot-driven for ease of use.",
            "Combines Performance Testing and Chaos Engineering."
        ],
        "notes": "Diagram Suggestion: Two boxes. 'E-Commerce Web App' and 'Performance Platform'. Arrow from Platform to App labeled 'Tests & Experiments'. Arrow from App to Platform labeled 'Observes Logs & Metrics'."
    },
    {
        "title": "Core Features: What Makes It Smart?",
        "points": [
            {"text": "Chatbot-Driven (AWS Lex):", "level": 0, "bold": True},
            {"text": "No more complex UIs. Users interact via natural language.", "level": 1},
            {"text": "'Run a stress test with 1000 users for 15 minutes.'", "level": 2},
            {"text": "Automated 'Smart' Scripting:", "level": 0, "bold": True},
            {"text": "Analyzes real production logs to automatically generate complex JMeter scripts (Pacing, Think Time, Correlation).", "level": 1},
            {"text": "Integrated Chaos Engineering:", "level": 0, "bold": True},
            {"text": "Uses AWS Systems Manager (SSM) to inject real-world failures (CPU stress, latency).", "level": 1},
            {"text": "Intelligent, Correlated Reporting:", "level": 0, "bold": True},
            {"text": "Automatically combines JMeter results with AWS CloudWatch metrics into a single, actionable report.", "level": 1}
        ]
    },
    {
        "title": "Advantages: A Game-Changer",
        "points": [
            {"text": "Speed:", "bold": True, "level": 0, "end_para": " Reduce test creation time from weeks to minutes."},
            {"text": "Realism:", "bold": True, "level": 0, "end_para": " Tests are based on actual production traffic, not guesswork."},
            {"text": "Cost-Efficiency:", "bold": True, "level": 0, "end_para": " Serverless & Fargate Spot save up to 90-95% on infrastructure costs."},
            {"text": "Unified View:", "bold": True, "level": 0, "end_para": " A single platform for performance and chaos provides a holistic view of resilience."},
            {"text": "Accessibility:", "bold": True, "level": 0, "end_para": " Empowers more team members to run sophisticated tests via a simple chatbot."}
        ]
    },
    {
        "title": "Architecture Deep Dive: Application & Deployment",
        "subtitle": "A serverless core orchestrated by AWS Step Functions, deployed via an automated CI/CD pipeline.",
        "points": [
            {"text": "User Interaction:", "bold": True, "level": 0},
            {"text": "User -> AWS Lex (Chatbot) -> Lambda -> Step Functions", "level": 1},
            {"text": "Orchestration:", "bold": True, "level": 0},
            {"text": "Step Functions manage the sequence of agents (Log Analyzer, Script Generator, etc.).", "level": 1},
            {"text": "Execution:", "bold": True, "level": 0},
            {"text": "Agents run as AWS Lambda functions; JMeter runs as an AWS Fargate Spot task.", "level": 1},
            {"text": "Deployment:", "bold": True, "level": 0},
            {"text": "Git Push -> GitHub Actions -> AWS CDK -> Deploys all infrastructure as code.", "level": 1}
        ],
        "notes": "Diagram Suggestion: A CI/CD pipeline flow on the top half, and the application architecture flow on the bottom half."
    },
    {
        "title": "Prototype in Action: A Walkthrough",
        "points": [
            {"text": "1. Interact with the Chatbot:", "bold": True, "level": 0},
            {"text": "Open the AWS Lex console and type: 'Run a load test for 200 users.'", "level": 1},
            {"text": "2. Monitor Live Status:", "bold": True, "level": 0},
            {"text": "Switch to the AWS Step Functions console to see the live, visual graph of the pipeline executing.", "level": 1},
            {"text": "3. View Live Logs:", "bold": True, "level": 0},
            {"text": "Query structured JSON logs in CloudWatch Logs Insights using the unique correlationId for the run.", "level": 1},
            {"text": "4. See the Final Report:", "bold": True, "level": 0},
            {"text": "Open the final report in S3, showing combined metrics and AI-generated recommendations.", "level": 1}
        ]
    },
    {
        "title": "Cost Savings & ROI: The Business Impact",
        "subtitle": "Automating this process drives significant savings in both effort and infrastructure.",
        "table": {
            "headers": ["Category", "Traditional Manual Approach", "Agentic Platform", "Savings"],
            "rows": [
                ["Scripting Effort", "40-80 hours per test suite", "< 1 hour (automated)", "~98% Reduction"],
                ["Test Infrastructure", "~$500+/mo (always-on)", "~$10-30/mo (pay-per-use)", "~90-95% Reduction"],
                ["Reporting Effort", "4-8 hours (manual)", "0 hours (automated)", "100% Reduction"],
            ]
        },
        "notes": "Return on Investment (ROI): By finding performance and resilience issues earlier, we reduce the risk of costly production outages and improve customer satisfaction."
    },
    {
        "title": "Advanced Architecture: Integrating Bedrock & n8n",
        "subtitle": "Evolving the platform with Generative AI and extensible workflow automation.",
        "points": [
            {"text": "Amazon Bedrock (The Brain):", "bold": True, "level": 0},
            {"text": "AI-Powered Script Generation: Bedrock generates complete JMX scripts from natural language and log data.", "level": 1},
            {"text": "AI-Powered Reporting: Bedrock acts as an expert performance engineer to analyze results and write actionable recommendations.", "level": 1},
            {"text": "n8n (The Integrator):", "bold": True, "level": 0},
            {"text": "A final step in the workflow calls an n8n webhook for notifications and integrations.", "level": 1},
            {"text": "Automatically create Jira tickets for failures, send rich Slack messages, and log results to Google Sheets.", "level": 2}
        ],
        "notes": "This slide details the integration of advanced services that make the platform truly intelligent and adaptive."
    },
    {
        "title": "Advanced Features: The Future is Autonomous",
        "subtitle": "Evolving from automation to a truly intelligent, self-learning system.",
        "points": [
            {"text": "For the Performance Tester: Effortless Test Creation", "bold": True, "level": 0},
            {"text": "Agentic Test Data Generation: AI automatically creates realistic test data (e.g., user profiles, product catalogs).", "level": 1},
            {"text": "For the Performance Engineer: Deep Diagnostics", "bold": True, "level": 0},
            {"text": "Automated Profiling & Root Cause Analysis: Agent automatically attaches profilers to pinpoint slow code during tests.", "level": 1},
            {"text": "For the Performance Architect: Proactive Optimization", "bold": True, "level": 0},
            {"text": "AI-Driven Cost & Capacity Advisor: Agent analyzes trends to recommend cost-saving infrastructure changes with no performance impact.", "level": 1},
            {"text": "Automated Architecture Resilience Validation: Agent reads IaC templates to design and run targeted chaos experiments.", "level": 1}
        ],
        "notes": "This slide outlines the roadmap for making the platform truly 'smart,' moving beyond simple automation to predictive and proactive capabilities."
    },
    {
        "title": "Prerequisites & Next Steps",
        "points": [
            {"text": "Prerequisites:", "bold": True, "level": 0},
            {"text": "An active AWS Account.", "level": 1},
            {"text": "GitHub Repository with secrets configured for AWS credentials.", "level": 1},
            {"text": "AWS CDK bootstrapped in the target AWS account/region.", "level": 1},
            {"text": "Roadmap:", "bold": True, "level": 0},
            {"text": "Q1: Deploy the platform and integrate with the e-commerce web app.", "level": 1},
            {"text": "Q2: Enhance the Report Synthesizer with more advanced ML models.", "level": 1},
            {"text": "Q3: Implement self-healing capabilities (e.g., auto-remediation suggestions).", "level": 1}
        ]
    },
    {
        "title": "Thank You",
        "subtitle": "Questions?"
    }
]

def create_presentation(filename="Agentic_Performance_Platform_Presentation.pptx"):
    """
    Generates a PowerPoint presentation from the slides_content list.
    """
    prs = Presentation()
    
    prs.slide_width = Inches(16)
    prs.slide_height = Inches(9)

    for i, slide_data in enumerate(slides_content):
        if i == 0:
            slide_layout = prs.slide_layouts[0]
            slide = prs.slides.add_slide(slide_layout)
        else:
            slide_layout = prs.slide_layouts[5]
            slide = prs.slides.add_slide(slide_layout)

        title = slide.shapes.title
        title.text = slide_data.get("title", "")

        body_shape = slide.placeholders[1] if len(slide.placeholders) > 1 else None

        if "subtitle" in slide_data and body_shape:
            body_shape.text = slide_data.get("subtitle", "")
            body_shape.text_frame.paragraphs[0].font.size = Pt(24)

        if "points" in slide_data:
            tf = body_shape.text_frame if body_shape else slide.shapes.add_textbox(Inches(1), Inches(2), Inches(14), Inches(6)).text_frame
            tf.clear()
            
            for point in slide_data["points"]:
                if isinstance(point, dict):
                    p = tf.add_paragraph()
                    p.text = point.get("text", "")
                    p.level = point.get("level", 0)
                    p.font.bold = point.get("bold", False)
                    p.font.size = Pt(22)
                    if "end_para" in point:
                        run = p.add_run()
                        run.text = point["end_para"]
                        run.font.bold = False
                else:
                    p = tf.add_paragraph()
                    p.text = point
                    p.level = 0
                    p.font.size = Pt(22)

        if "table" in slide_data:
            table_data = slide_data["table"]
            rows, cols = len(table_data["rows"]) + 1, len(table_data["headers"])
            shape = slide.shapes.add_table(rows, cols, Inches(1), Inches(2.5), Inches(14), Inches(4))
            table = shape.table

            for c, header in enumerate(table_data["headers"]):
                table.cell(0, c).text = header
                table.cell(0, c).text_frame.paragraphs[0].font.bold = True

            for r, row_data in enumerate(table_data["rows"]):
                for c, cell_text in enumerate(row_data):
                    table.cell(r + 1, c).text = cell_text
        
        if "notes" in slide_data:
            notes_slide = slide.notes_slide
            text_frame = notes_slide.notes_text_frame
            text_frame.text = slide_data["notes"]

    print(f"Presentation '{filename}' created successfully.")
    prs.save(filename)

if __name__ == '__main__':
    create_presentation()