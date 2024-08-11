from .objects import *

class DemoLogger:
    def __init__(self):
        self.cached_turns_by_request_id = dict()

    def __call__(self, doc):
        self.worker(doc)

    def worker(self, doc):
        if doc['flag'] == 'PostRequest':
            if doc.get('round') is None:
                return
            if doc['round'] == 0:
                self.insert_session(doc)
            elif doc['round'] > 0:
                self.insert_turn(doc)
            else:
                raise NotImplementedError()
        elif doc['flag'] == 'ModelGeneration':
            if doc.get('request_id') is None:
                return
            self.update_model_generation(doc)

    def insert_session(self, doc):
        session, turn = Session.import_from_json_log(doc, to_save=True)
        self.cached_turns_by_request_id[doc['request_id']] = turn

    def insert_turn(self, doc):
        session = Session.objects.get(session_id=doc['session_id'])
        turn = Turn.import_from_json_log(session, doc)
        session.turns.append(turn)
        session.save()
        self.cached_turns_by_request_id[doc['request_id']] = turn
        
    def update_model_generation(self, doc):
        if doc['request_id'] in self.cached_turns_by_request_id:
            turn = self.cached_turns_by_request_id[doc['request_id']]
        else:
            turn = Turn.objects.get(request_id=doc['request_id'])
        turn.response = doc['response']
        turn.parsed_action = doc['parsed_action']
        turn.save()