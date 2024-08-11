import logging
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
import os
import datetime


def _custom_rotating_file(base_filename, maxBytes):
    def rotator(source, dest):
        if os.path.getsize(source) > maxBytes:
            os.rename(source, dest)
    return rotator

def setup_logger(app, log_path="./logs"):
    log_dir = os.path.join(log_path,datetime.datetime.now().strftime('%Y-%m'))
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    info_log_path = os.path.join(log_dir, f"{datetime.datetime.now().strftime('%Y-%m-%d')}-info.log")
    error_log_path = os.path.join(log_dir, f"{datetime.datetime.now().strftime('%Y-%m')}-error.log")

    info_handler = TimedRotatingFileHandler(info_log_path, when='midnight', interval=1, backupCount=10)
    info_handler.setLevel(logging.INFO)
    info_formatter = logging.Formatter('%(asctime)s - %(filename)s - %(lineno)d - %(levelname)s - %(message)s')
    info_handler.setFormatter(info_formatter)
    info_handler.rotator = _custom_rotating_file(info_handler.baseFilename, maxBytes=10*1024*1024)
    
    error_handler = TimedRotatingFileHandler(error_log_path, when='midnight', interval=1, backupCount=10)
    error_handler.setLevel(logging.ERROR)
    error_formatter = logging.Formatter('%(asctime)s - %(filename)s - %(lineno)d - %(levelname)s - %(message)s')
    error_handler.setFormatter(error_formatter)
    error_handler.rotator = _custom_rotating_file(error_handler.baseFilename, maxBytes=10*1024*1024)

    # add these handlers to Flask's app.logger
    app.logger.addHandler(info_handler)
    app.logger.addHandler(error_handler)
    app.logger.setLevel(logging.DEBUG)

