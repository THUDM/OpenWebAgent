import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import '@/common/styles/index.less'
import Popup from '@/popup'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
    <ConfigProvider locale={zhCN}>
        <Popup />
    </ConfigProvider>
)
