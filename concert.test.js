const request = require('supertest');
const app = require('./app');

it("Get concerts list from a user", async () => {
    const res = await request(app).get("/concerts/IfAA0dFdGHEZRjDJyc1rTnFwEj74XHox");


        expect(res.statusCode).toBe(200);
        expect(res.body.list).toEqual(expect.arrayContaining([
                    {
        "_id": "683067e625ddf7f110c11288",
        "artist": "IAM",
        "venue": "Irving Plaza Powered By Verizon 5G",
        "date": "2025-07-31T00:00:00.000Z",
        "city": "New York",
        "pic": "https://s1.ticketm.net/dam/a/94c/9ccef925-9849-496f-9cd2-1ddaa067794c_637671_EVENT_DETAIL_PAGE_16_9.jpg",
        "seatmap": "https://mapsapi.tmol.io/maps/geometry/3/event/00006284F6AA92F4/staticImage?type=png&systemId=HOST",
        "__v": 0
        }   ,
        {
        "_id": "683067e925ddf7f110c1128b",
        "artist": "IAM",
        "venue": "L'Olympia",
        "date": "2025-08-11T00:00:00.000Z",
        "city": "Montreal",
        "pic": "https://s1.ticketm.net/dam/e/682/ad0c5d8d-3a42-4ef9-a19a-ac07aa4a2682_EVENT_DETAIL_PAGE_16_9.jpg",
        "seatmap": "https://mapsapi.tmol.io/maps/geometry/3/event/31006288C1093025/staticImage?type=png&systemId=HOST",
        "__v": 0
        },                   
        ]))
    })
