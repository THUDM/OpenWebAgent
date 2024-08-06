from .objects import *

import threading


class DemoLogger:
    def __init__(self):
        self.cached_turns_by_request_id = dict()

    def __call__(self, doc, use_threading=True):
        if use_threading:
            if doc['flag'] == 'PostRequest' and doc.get('round') == 0:
                self.insert_session(doc)
            elif doc['flag'] == 'Response':
                if doc.get('round') is None:
                    return
                self.update_operation(doc)
            else:
                worker = threading.Thread(target=self.worker, args=(doc, ))
                worker.start()
        else:
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
        elif doc['flag'] == 'CompressedHTML':
            if doc.get('request_id') is None:
                return
            self.update_compressed_xml(doc)
        elif doc['flag'] == 'ModelGeneration':
            if doc.get('request_id') is None:
                return
            self.update_model_generation(doc)
        elif doc['flag'] == 'Response':
            if doc.get('request_id') is None:
                return
            self.update_operation(doc)
        elif doc['flag'] == 'FeedbackType':
            if doc.get('session_id') is None:
                return
            self.update_feedback_type(doc)
        elif doc['flag'] == 'FeedbackContent':
            if doc.get('session_id') is None:
                return
            self.update_feedback_content(doc)
        else:
            print('Unknown flag {}'.format(doc['flag']))
            raise NotImplementedError("Flag '{}' not implemented".format(doc['flag']))

    def insert_session(self, doc):
        session, turn = Session.import_from_json_log(doc, to_save=True)
        self.cached_turns_by_request_id[doc['request_id']] = turn

    def insert_turn(self, doc):
        session = Session.objects.get(session_id=doc['session_id'])
        turn = Turn.import_from_json_log(session, doc)
        session.turns.append(turn)
        session.save()
        self.cached_turns_by_request_id[doc['request_id']] = turn

    def update_compressed_xml(self, doc):
        if doc['request_id'] in self.cached_turns_by_request_id:
            turn = self.cached_turns_by_request_id[doc['request_id']]
        else:
            turn = Turn.objects.get(request_id=doc['request_id'])
        turn.compressed_xml = doc['content']
        turn.save()

    def update_model_generation(self, doc):
        if doc['request_id'] in self.cached_turns_by_request_id:
            turn = self.cached_turns_by_request_id[doc['request_id']]
        else:
            turn = Turn.objects.get(request_id=doc['request_id'])
        turn.response = doc['response']
        turn.parsed_action = doc['parsed_action']
        turn.save()

    def update_operation(self, doc):
        if doc['request_id'] in self.cached_turns_by_request_id:
            turn = self.cached_turns_by_request_id[doc['request_id']]
        else:
            turn = Turn.objects.get(request_id=doc['request_id'])
        if doc.get('observation', None):
            turn.observation = doc['observation']
        if doc.get('response', None):
            turn.response = doc['response']
        turn.save()

        # Means the end of the turn
        if doc['request_id'] in self.cached_turns_by_request_id:
            self.cached_turns_by_request_id.pop(doc['request_id'])

    def update_feedback_type(self, doc):
        session = Session.objects.get(session_id=doc['session_id'])
        session.feedback_type = doc['feedback_type']
        session.save()

    def update_feedback_content(self, doc):
        session = Session.objects.get(session_id=doc['session_id'])
        session.feedback_content = doc['feedback_content']
        session.save()

