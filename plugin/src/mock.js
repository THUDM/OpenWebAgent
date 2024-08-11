import Mock from 'mockjs'
import { mockFetch } from 'mockjs-fetch'
mockFetch(Mock)

// mock login
Mock.mock(/login/, {
    code: 200,
    msg: 'OK',
    data: {
        nickname: 'temp-user',
        accessToken: 'fqh0i-LyINZ-RvK5d-Akj3a-uBYRl',
    }
})