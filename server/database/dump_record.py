from .objects import *

def dump_session(session_id=None, output_dir='.', save_html = True):
    session = Session.objects.get(session_id=session_id)
    print(session)
    session.dump(output_dir=output_dir, save_html = save_html)

# if __name__ == '__main__':
#     dump_session(dump_args.session_id, dump_args.output_dir, dump_args.save_html)
