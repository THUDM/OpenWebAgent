import re
import json

SCREENSHOT_CLF_PROMPT = """You are a professional visual language question answer system that can answer user's question according to the screenshot provided. You will strictly follow user's output format requirement, and do not generate any additional contents that are not asked by the user. Your answer is honestly based on the visual information from the screenshot. Answer 'Yes' or 'No' after doing `* Anlysis`.

Example:
<|user|>
** screenshot **
there are paragraphs that describe the page limit of ICLR 2024?

<|assistant|>
* Analysis: From the screenshot of ICLR 2024 CFP, I see a sentence saying 'There will be a strict upper limit of 9 pages for the main text of the submission, with unlimited additional pages for citations.', which satisfies the user's request. So my answer should be 'Yes'.
```
{"response": "Yes"}
``` 
"""


def get_code_snippet(content):
    code = re.search(r'```.*?\n([\s\S]+?)\n```', content)
    if code is None:
        raise RuntimeError()
    code = code.group(1)
    return code


def screenshot_contains(engine, keywords, screenshot):
    return engine.single_turn_generation(
        system_prompt=SCREENSHOT_CLF_PROMPT,
        prompt=f"Does the screenshot contains '{keywords}'",
        image_path=screenshot
    ) == 'Yes'


def screenshot_satisfies(engine, condition, screenshot):
    response = engine.single_turn_generation(
        system_prompt=SCREENSHOT_CLF_PROMPT,
        prompt=f"{condition}",
        image_path=screenshot
    )
    print(f"Call screenshot_satisfies(condition='{condition}', screenshot='{screenshot}'):\n{response}")
    resp_json = json.loads(get_code_snippet(response))
    return resp_json['response'] == 'Yes'
