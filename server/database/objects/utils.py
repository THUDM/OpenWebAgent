import os
import math
from textwrap import wrap
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw

def draw_cross_on_image(img, coordinates):
    draw = ImageDraw.Draw(img)
    x, y = coordinates
    cross_length = 10
    line_width = 2
    draw.line((x - cross_length // 2, y, x + cross_length // 2, y), fill="green", width=line_width)
    draw.line((x, y - cross_length // 2, x, y + cross_length // 2), fill="blue", width=line_width)
    return img

def draw_rectangle_on_image(image_obj, bbox):
    # initialize ImageDraw
    draw = ImageDraw.Draw(image_obj)

    # draw the rectangle
    draw.rectangle(bbox, outline='green', width=6)

    return image_obj

def draw_arrow_on_image(img, start, end):
    draw = ImageDraw.Draw(img)
    arrow_length = 50
    arrow_angle = math.pi / 6
    draw.line([start, end], fill="green", width=10)
    angle = math.atan2(end[1] - start[1], end[0] - start[0]) + math.pi
    arrow_point1 = (
    end[0] + arrow_length * math.cos(angle - arrow_angle), end[1] + arrow_length * math.sin(angle - arrow_angle))
    arrow_point2 = (
    end[0] + arrow_length * math.cos(angle + arrow_angle), end[1] + arrow_length * math.sin(angle + arrow_angle))
    draw.polygon([end, arrow_point1, arrow_point2], fill="green")
    return img

def display_text_with_wrap(ax, text, max_width, fontdict=None, **kwargs):
    # use textwrap.wrap to create new lines
    wrapped_text = "\n".join(wrap(text, width=max_width))

    # draw text in specific position with ax.text
    text_obj = ax.text(0.5, 0.5, wrapped_text, ha='center', va='center',
                       transform=ax.transAxes, fontdict=fontdict, **kwargs)

    # adjust font size to fit the text within the axes
    renderer = ax.figure.canvas.get_renderer()
    bbox = text_obj.get_window_extent(renderer=renderer)
    while bbox.width > ax.get_window_extent(renderer=renderer).width or bbox.height > ax.get_window_extent(renderer=renderer).height:
        fontdict['size'] -= 1
        text_obj.set_fontsize(fontdict['size'])
        bbox = text_obj.get_window_extent(renderer=renderer)

def create_text_image(text,base_image, font_size=24, font_name='Songti SC', log_path=None, transparent=True):
    # comfirm the path of the text image exists
    if log_path is None:
        log_path = '.'  # Use the current directory
    text_image_path = os.path.join(log_path, 'text_image.png')

    # use base image to set the size
    base_width, base_height = base_image.size

    # matplotlib font settings
    plt.rcParams['font.sans-serif'] = [font_name]
    # plt.rcParams['font.size'] = font_size
    # plt.rcParams['savefig.transparent'] = transparent

    # calculate for the size of new image
    width = base_width / 100  # to inch (we use DPI=100)
    height = (base_height / 10) / 100 
    dpi = 100
    fig, ax = plt.subplots(figsize=(width, height), dpi=dpi)
    display_text_with_wrap(ax, text, max_width=base_width, fontdict={'size': font_size})
    # ax.text(0.5, 0.5, text, ha='center', va='center', transform=ax.transAxes)
    ax.axis('off')

    fig.savefig(text_image_path, format='png', transparent=transparent)
    plt.close(fig)

    return text_image_path

def merge_text(img, text_image, position=(0, 0)):
    base_image = img
    text_image = Image.open(text_image).convert("RGBA")
    base_width, base_height = base_image.size
    new_text_height = base_height // 10
    text_image_resized = text_image.resize((base_width, new_text_height))
    new_image = Image.new("RGBA", base_image.size)
    new_image.paste(base_image, (0, 0))
    new_image.paste(text_image_resized, position, text_image_resized)

    return new_image

def merge_text_up(img, text_image, position=(0, 0)):
    base_image = img
    text_image = Image.open(text_image).convert("RGBA")
    base_width, base_height = base_image.size

    # calculate for the size of new image
    new_text_height = base_height // 10
    text_image_resized = text_image.resize((base_width, new_text_height))

    new_image_height = base_height + new_text_height
    new_image = Image.new("RGBA", (base_width, new_image_height))

    # concat the images together
    new_image.paste(text_image_resized, position)

    base_image_position = (0, new_text_height)
    new_image.paste(base_image, base_image_position)

    return new_image

def merge_images(images):
    # calculate the total area and find the maximum width and height
    total_area = sum(im.size[0] * im.size[1] for im in images)
    max_width = max(im.size[0] for im in images)
    max_height = max(im.size[1] for im in images)

    # calculate the side length of the square
    side_length = int((total_area) ** 0.5)
    
    cols = max(max_height, side_length) // min(max_height, max_width)
    rows = len(images) // cols + (1 if len(images) % cols > 0 else 0)
    total_width = max_width * cols
    total_height = max_height * rows

    new_im = Image.new('RGBA', (total_width, total_height))

    x_offset = 0
    y_offset = 0
    for i, im in enumerate(images):
        if x_offset + im.size[0] > total_width:
            x_offset = 0
            y_offset += max_height

        new_im.paste(im, (x_offset, y_offset))
        x_offset += im.size[0]

        if (i + 1) % cols == 0:
            x_offset = 0
            y_offset += max_height

    return new_im
