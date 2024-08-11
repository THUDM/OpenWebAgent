import traceback

from mongoengine import Document, StringField, ListField, ReferenceField, DateTimeField, DictField, IntField
from tqdm import tqdm

from .turn import Turn
from .utils import *

import datetime
import os
import io
import json
class Session(Document):
    session_id = StringField(required=True)
    # instructions = ListField(DictField())
    instruction = StringField()

    turns = ListField(ReferenceField(Turn))
    created_at = DateTimeField()

    meta_data = DictField()
    
    feedback_type = IntField()
    feedback_content = StringField()
    
    source= StringField()

    meta = {
        'switch_db': 'web-assistant-demo',
        'collection': 'session',
        'indexes': [
            'session_id',
            'instruction',
            'created_at',
        ]
    }

    @classmethod
    def get_session(cls, session_id):
        # check if session_id exists
        session = Session.objects(session_id=session_id).first()
        
        if session is None:
            # create a new session if not existing
            session = Session(session_id=session_id)
            session.turns = []
            session.save()
        return session

    @classmethod
    def import_from_json_log(cls, doc, to_save=True):
        print("session",doc.get('prompt'))
        session = Session.objects.get(session_id=doc['session_id'])
        session.instruction = doc['instruction']    
        session.source = doc.get('source')
        session.created_at = doc.get('created_at', datetime.datetime.now())
        session.save()

        turn = Turn.import_from_json_log(session=session, doc=doc)
        if to_save:
            turn.save()

        session.turns.append(turn)
        if to_save:
            session.save()

        return session, turn

    def dump(self, output_dir, save_html = True):
        log_path = f"{output_dir}/{self.session_id}"
        os.makedirs(log_path, exist_ok=True)
        res = {'_id': str(self.id), 'session_id': self.session_id, 'instruction': self.instruction,
            'created_at': str(self.created_at), 'turns': []}

        all_images = []
        for turn in tqdm(self.turns):
            turn_record = turn.dump()
            res['turns'].append(turn_record)

            try:
                # save Original HTML
                if save_html:
                    with open(f"{log_path}/{turn.round}.html", 'w') as f:
                        f.write(turn.html_text)

                # save bbox-plotted screenshot
                img = Image.open(io.BytesIO(turn.screenshot.read()))
                parsed_action = turn.parsed_action
                print(parsed_action)

                operation = parsed_action.get('action', parsed_action.get('operation'))
                text = ''
                if 'argument' in parsed_action:
                    text = ', content: ' + parsed_action['argument']
                
                for key in ['message', 'content','query', 'instruction']:
                    if key in parsed_action.get('kwargs', {}):
                        if key == 'instruction':
                            text = text +", description: "+ parsed_action['kwargs'][key]
                        else:
                            text = ", content: " + parsed_action['kwargs'][key]
                
                if 'bbox' in parsed_action and parsed_action['bbox'] is not None:
                    bbox = parsed_action['bbox']
                    start_pos = ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)
                    processed_img = draw_cross_on_image(img, start_pos)
                    processed_img = draw_rectangle_on_image(processed_img, bbox)
                else:
                    processed_img = img


                text_img = create_text_image(f"Operation: {operation}{text}", processed_img, 48, transparent=False)
                processed_img = merge_text_up(processed_img, text_img, position=(0, 0))

                all_images.append(processed_img)
                processed_img.save(f"{log_path}/{turn.round}.png")

            except Exception as e:
                print(traceback.format_exc())
                continue

        # assuming all_images now contains all processed images
        final_image = merge_images(all_images)
        text_img = create_text_image("Task: " + self.instruction, final_image, 48, transparent=False)
        final_image = merge_text_up(final_image, text_img, position=(0, 0))
        final_image.save(f"{log_path}/final_combined.png")

        # save trace
        json.dump(res, open(f"{log_path}/session.json", 'w'), indent=4, ensure_ascii=False)
