

import DislikeSvg from "@/assets/dislike.svg";
import LikeSvg from "@/assets/like.svg";
import { Button, Tag, Collapse, Spin } from "antd";
import { MessageFilled, PlayCircleFilled } from "@ant-design/icons";

import { useEffect, useState } from "react";
import './index.less'


const Answer = (props) => {
    const { loading, message, isFinished } = props;

    const { id, parts, actions } = message;

    const renderContent = () => {
        console.log("parts: ", parts);
        
        message.parts.map((part, index) => {
            console.log('part', part)
            if (part.type === 'text') {
                return <div key={index} className="text-[16px] flex flex-col">
                    <div>Step: {part.content.round}</div>
                    <div>Action: <Tag className="multiline-tag" icon={<PlayCircleFilled />} color="#2db7f5">{part.content.action}</Tag></div>
                    {part && part.content && part.content.kwargs && part.content.kwargs.argument ? <div>Argument: <Tag className="multiline-tag" icon={<MessageFilled />} color="#2db7f5">{part.content.kwargs.argument}</Tag></div> : null}
                    {part && part.content && part.content.kwargs && part.content.kwargs.instruction ? <div>Segment: <Tag className="multiline-tag" icon={<MessageFilled />} color="#2db7f5">{part.content.kwargs.instruction}</Tag></div> : null}
                </div>;
            }
        })
    }

    const renderBtn = (actions) => {
        return actions?.map((action, index) => {
            return <Button key={index} className="bg-[#1A73E8] text-white px-[16px] py-[8px] rounded-xl mr-[8px]">{action.text}</Button>;
        })
    }

    useEffect(() => {
        return () => {
            console.log('unmount');
        }
    }, []);

    return (
        <div key={id} className="w-full">
            <div className="flex">
                <div className="rounded-b-xl rounded-tr-xl flex-1 text-[16px] mt-[4px] overflow-hidden">
                    {renderContent()}
                    <div className="mt-[8px]">{renderBtn(actions)}</div>
                </div>
            </div>
            <div className="flex w-full">
                {!loading && (
                    <div className="flex w-full flex-row-reverse">
                        <img src={DislikeSvg} alt="dislike" width={24} />
                        <img src={LikeSvg} alt="like" width={24} />
                    </div>
                )}
            </div>
        </div>
    )
};

export default Answer;