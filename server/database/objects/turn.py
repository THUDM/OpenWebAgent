from mongoengine import *
from datetime import datetime
from io import BytesIO, IOBase

class Turn(Document):
    # Content fields
    request_id = StringField()
    session = ReferenceField('Session')
    round = IntField()

    prompt = StringField()
    response = StringField()
    parsed_action = DictField()

    html_text = StringField()
    screenshot = ImageField()
    url = StringField()

    created_at = DateTimeField()
    updated_at = DateTimeField()
    
    source= StringField()

    meta = {
        'switch_db': 'web-assistant-demo',
        'collection': 'turn',
        'indexes': [
            'request_id',
            'session',
            'round',
            'created_at',
            'updated_at'
        ]
    }

    @classmethod
    def import_from_json_log(cls, session, doc, to_save=True):
        ts = datetime.now()
        turn = Turn(
            request_id=doc['request_id'],
            session=session,
            round=doc['round'],
            url = doc.get('url'),
            prompt=doc.get('prompt'),
            source=doc.get('source'),
            html_text=doc.get('html_text'),
            created_at=doc.get('created_at', ts),
            updated_at=doc.get('updated_at', ts)
        )

        if doc.get('screenshot'):
            readable = doc['screenshot']
            if isinstance(readable, IOBase):
                turn.screenshot.put(readable)
            else:
                turn.screenshot.put(BytesIO(readable))

        if to_save:
            turn.save()
        return turn

    def dump(self, dump_xml=False):
        res = {
            "_id": str(self.id),
            "request_id": self.request_id,
            "session": str(self.session),
            "round": self.round,
            "response": self.response,
            "parsed_action": self.parsed_action,
            "created_at": str(self.created_at),
            "updated_at": str(self.updated_at)
        }

        if dump_xml:
            res['html_text'] = self.html_text

        return res
