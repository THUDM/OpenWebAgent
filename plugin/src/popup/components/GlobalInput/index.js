import { useEffect, useRef, useState, useImperativeHandle, useCallback } from "react";
import ReactDOM from "react-dom";
import { Spin, Input, Tooltip, Popover, Flex, Button, message, Popconfirm } from "antd";
import Icon, { LoadingOutlined, DownCircleOutlined, UpCircleOutlined, PlusCircleOutlined, PauseCircleFilled } from "@ant-design/icons";
import { debounce } from "lodash";

import Search from "@/assets/search.svg";
import SendSvg from "../../../assets/send-icon.svg";
import StopIconSvg from "../../../assets/stop-icon.svg";
import './index.less';


const GlobalInput = (props) => {
    const { style, classname, prefix, loading, onPressEnter, mode, gref, onChange, isFinished, handleCleanMessages, onPauseChat, pausedValue, onStopPauseChat } = props;
    // const ref = useRef(null);
    const ref = useRef(null);
    const popupRef = useRef(null);
    const [popupOpen, setPopupOpen] = useState(false);
    const [isLock, setIsLock] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isDown, setIsDown] = useState(false);
    const hide = () => {
        setPopupOpen(false);
    }

    const valueChange = useCallback(
        debounce(async (e) => {
            if (onChange) onChange(e.target.value);
            if (e.target.value.length > 0) {
                setPopupOpen(true);
            } else {
                hide();
            }
        }, 300),
        [],
    );

    const focusEnd = () => {
        ref.current?.focus();
        document.execCommand('selectAll', false);
        document.getSelection()?.collapseToEnd();
    }

    const pressEnter = (e) => {
        if (loading || !isFinished) return;
        if (e.charCode === 13 && !e.shiftKey) {
            e.preventDefault();
            focusEnd();

            if (onPressEnter) {
                let text = e.target.value;
                // remove "enter" from the text
                const filteredText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                onPressEnter(filteredText, setInputValue(''));
            }
        }
    }

    const paste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        // remove "Enter" from the text, but keep the key comb "Shift + Enter"
        const filteredText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        document.execCommand('insertText', false, filteredText);
    }

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    useEffect(() => {
        const handleTextSelection = () => {
            hide();
        };
        window.addEventListener('mouseup', handleTextSelection);
        window.addEventListener('resize', handleTextSelection);

        return () => {
            window.removeEventListener('mouseup', handleTextSelection);
            window.removeEventListener('resize', handleTextSelection);
        };
    }, []);

    useImperativeHandle(gref, () => ({
        ref: () => ref,
    }));

    const confirm = (e) => {
        handleCleanMessages([]);
        message.success('Action completed');
    };
      
    const cancel = (e) => {
        message.success('Action cancelled');
    };

    return (
        <div className="w-full">
            <div className={`query-input-wrap relative`} 
                style={{ ...style }} 
                id="query-input-wrap-j">
                {prefix ? prefix : null}
                <div className="chat-input w-full">
                    <div className="chat-toolbar">
                        <div className={ !isFinished && !pausedValue ? "chat-toolbar-left active" :  "chat-toolbar-left"}>
                            <Tooltip style={{ fontSize: 12 }} color="#108ee9" placement="top" title={"Click to pause"}>
                                <div className="flex items-center cusor-pointer height-[24px]" onClick={() => onPauseChat && onPauseChat()}>
                                    <svg className="w-[16px] h-[16px]" t="1719907928724" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2348"><path d="M510.9 60.7c-245.6 0-446.7 199.8-446.7 446.7C64.2 753 263.9 954 510.8 954s446.6-199.7 446.6-446.6c0.1-245.6-199.6-446.7-446.5-446.7z m-24.7 574c0 8.8-7.2 16-16 16h-94.9c-8.8 0-16-7.2-16-16V389.3c0-8.8 7.2-16 16-16h94.9c8.8 0 16 7.2 16 16v245.4z m178.5 0c0 8.8-7.2 16-16 16h-94.9c-8.8 0-16-7.2-16-16V389.3c0-8.8 7.2-16 16-16h94.9c8.8 0 16 7.2 16 16v245.4z" fill="currentColor" p-id="2349"></path></svg>
                                    <span className="pl-[4px]">Pause</span>
                                </div>
                            </Tooltip>
                            <Popconfirm
                                title="Are you sure to clear the chat?"
                                description="Please note that clearing the chat will start a new conversation."
                                onConfirm={confirm}
                                onCancel={cancel}
                                okText="Yes"
                                cancelText="No"
                            >
                                <div className={isFinished ? "input-instruction active" : "input-instruction"} disabled={!isFinished}>
                                    <svg className="w-[16px] h-[16px]" t="1719907987231" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3343"><path d="M736 128l-32-64H320l-32 64H128v128h768V128H736zM192 896a64 64 0 0 0 64 64h512a64 64 0 0 0 64-64V320H192z" fill="currentColor" p-id="3344"></path></svg>
                                    <span className="pl-[4px]">Clear</span>
                                </div>
                            </Popconfirm>
                        </div>
                    </div>
                    <div className="input-wrapper" style={{ height: '118px', maxHeight: 'min(50vh, -580px + 100vh)', minHeight: '124px'}}>
                        <div className="chat-input-header"></div>
                        <div className="input-box">
                            <div className="textarea-mentions">
                                <Input.TextArea
                                    placeholder="Type or paste content here"
                                    value={inputValue}
                                    onChange={handleInputChange}
                                    onKeyPress={pressEnter}
                                    autosize="true"
                                    variant={false}
                                    style={{resize: 'none', height: 48, minHeight: 48, maxHeight: 144}}
                                    suppressContentEditableWarning
                                    onCompositionStart={() => setIsLock(true)}
                                    onCompositionEnd={(e) => {
                                        setIsLock(false);
                                        valueChange(e);
                                    }}x
                                    onPaste={paste}
                                    ref={ref}
                                    disabled={!isFinished}
                                />
                            </div>
                        </div>
                    <div className="sender">
                        <div className="input-inside-actions">
                            <Tooltip style={{ fontSize: 12 }} color="#108ee9" placement="top" title="Send(↵)">
                                <div className={(inputValue && inputValue.length > 0 && isFinished)  ? `input-msg-btn active` : `input-msg-btn`} onClick={() => onPressEnter && onPressEnter(inputValue || '', setInputValue(''))}>
                                    <svg class="icon" width="20" height="20" fill="none" viewBox="0 0 20 20" style={{ width: 20, height: 20 }}><g><path fill="currentColor" d="M14.006 3.162 4.157 6.703c-1.504.541-2.256.812-2.282 1.332-.025.52.697.864 2.14 1.55l3.991 1.897c.242.115.363.172.457.264.094.092.153.213.272.453l1.924 3.878c.698 1.408 1.047 2.112 1.564 2.082.516-.03.78-.771 1.307-2.252l3.477-9.753c.721-2.023 1.082-3.034.556-3.558-.525-.524-1.536-.16-3.557.566Z" data-follow-fill="#C0C5CC"></path></g></svg>
                                </div>
                            </Tooltip>
                        </div>
                    </div>
                </div>
          
             </div>
                {ReactDOM.createPortal(
                    <div
                        ref={popupRef}
                        style={{
                            position: 'absolute',

                        }}>

                    </div>,
                    document.body,
                )}
            </div>
            {/* {loading ? (
                <Spin indictor={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
            ) : (
                <>
                {mode === 'query' ? (
                    <img src={Search} 
                        className="w-24[px] mx=[8px]" 
                        style={{ cursor: 'pointer' }} 
                        onClick={() => onPressEnter && onPressEnter(ref?.current?.innerText?.replace(/[\r\n]+/g, '') || '', ref)} />
                ) : (
                    <span className="ml-[8px] bg-secondPrimaryColor rounded-3xl cursor-pointer w-[74px] h-[48px] flex items-center justify-center"
                        onClick={() => onPressEnter && onPressEnter(ref?.current?.innerText?.replace(/[\r\n]+/g, '') || '', ref)}>
                        <img src={SendSvg} className="w-[20px]" />
                    </span>
                )}
                </>
            )} */}
        </div>
    );
};

export default GlobalInput;