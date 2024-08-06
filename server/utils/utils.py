import ast
import requests
from PIL import Image
from colorama import Fore, Style

def print_with_color(text: str, color="white"):
    text = str(text)
    if color == "red":
        print(Fore.RED + text)
    elif color == "green":
        print(Fore.GREEN + text)
    elif color == "yellow":
        print(Fore.YELLOW + text)
    elif color == "blue":
        print(Fore.BLUE + text)
    elif color == "magenta":
        print(Fore.MAGENTA + text)
    elif color == "cyan":
        print(Fore.CYAN + text)
    elif color == "white":
        print(Fore.WHITE + text)
    elif color == "black":
        print(Fore.BLACK + text)
    else:
        print(text)
    print(Style.RESET_ALL)

def format_bbox(bbox, image, window):
    # get the height and width about the picture
    width, height = image.size
    scale_x = width / window['viewport_width']
    scale_y = height / window['viewport_height']

    new_bbox = [bbox[0] * scale_x, bbox[1] * scale_y, (bbox[0] + bbox[2]) * scale_x, (bbox[1] + bbox[3]) * scale_y]
    return new_bbox

def remove_comments(code):
    # split the code
    for key in ['exit(','do(','go_backward(']:
        if key in code:
            return key + code.split(key)[-1]
    lines = code.split('\n')
    for i, line in enumerate(lines):
        if line.strip().startswith('#'):
            # ignore comment
            continue
        else:
            # just keep content behind
            return '\n'.join(lines[i:])
    return ''

def parse_function_call(expression):
    expression = remove_comments(expression)
    # parse the string into AST
    expression = expression.strip()
    tree = ast.parse(expression, mode='eval')

    # parse function name
    func_call = tree.body
    if not isinstance(func_call, ast.Call):
        return {
            "operation": expression,
        }

    func_name = func_call.func.id
    result = {
        "operation": func_name,
    }

    # get the arguments
    args = func_call.args
    kwargs = func_call.keywords

    for kw in kwargs:
        if func_name == "do" and kw.arg == "action":
            result["action"] = ast.literal_eval(kw.value)
        elif func_name == "do" and kw.arg == "argument":
            result["argument"] = ast.literal_eval(kw.value)
        else:
            if "kwargs" not in result:
                result["kwargs"] = {}
            if kw.arg == "element":
                try:
                    # for inner function
                    inner_func = kw.value
                    if isinstance(inner_func, ast.Call) and inner_func.func.id == 'find_element_by_instruction':
                        for inner_kw in inner_func.keywords:
                            if inner_kw.arg == "instruction":
                                result["kwargs"]["instruction"] = ast.literal_eval(inner_kw.value)
                    else:
                        result["kwargs"][kw.arg] = ast.literal_eval(inner_func)
                except Exception:
                    result["kwargs"][kw.arg] = ast.literal_eval(kw.value)
            else:
                result["kwargs"][kw.arg] = ast.literal_eval(kw.value)

    return result