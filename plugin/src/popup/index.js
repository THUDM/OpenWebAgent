import ChatWindow from "./pages/chatWindow";
import './index.less';

const Popup = () => {
    return <div className="w-full h-full relative flex">
        <ChatWindow />
    </div>
}

export default Popup;