const request = require('supertest');
const app = require('./app');

const postTestAuthor = {
  username: 'myomyo',
  token: 'Uh7bu94UL3Ww0RkHnC75iYc-ynEf94_o',
};

it('POST /posts créer un post', async () => {
  const res = await request(app)
    .post(`/posts/${postTestAuthor.token}`)
    .send({
      text: 'writing post test',
      author: `${postTestAuthor.username}`,
    });

  expect(res.statusCode).toBe(200);
  expect(res.body.result).toEqual(true);
  expect(res.body.post.text).toEqual('writing post test');
  expect(res.body.post.author.username).toEqual(postTestAuthor.username);
});