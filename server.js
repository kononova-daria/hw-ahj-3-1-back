const http = require('http');
const Koa = require('koa');
const koaBody = require('koa-body');
const cors = require('koa2-cors');
const WS = require('ws');

const app = new Koa();

app.use(koaBody({
  urlencoded: true,
  multipart: true,
  text: true,
  json: true,
}));

app.use(
  cors({
    origin: '*',
    credentials: true,
    'Access-Control-Allow-Origin': true,
    allowMethods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  }),
);

const port = process.env.PORT || 7020;
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });

let contacts = [];

wsServer.on('connection', (ws) => {
  ws.on('message', (msg) => {
    const parameters = JSON.parse(msg);

    if (parameters.event === 'login') {
      const newName = parameters.data;
      if (contacts.findIndex((item) => item.name.toUpperCase() === newName.toUpperCase()) === -1) {
        const user = ws;
        user.name = newName;
        contacts.push(user);
        ws.send(JSON.stringify({
          event: 'successfulLogin',
          data: contacts.map((item) => item.name),
        }));
        contacts
          .filter((item) => item.name !== newName)
          .forEach((item) => {
            item.send(JSON.stringify({
              event: 'newUser',
              data: contacts.map((contact) => contact.name),
            }));
          });
      } else {
        ws.send(JSON.stringify({
          event: 'failedLogin',
        }));
      }
    }

    if (parameters.event === 'sendMessage') {
      const message = {
        user: parameters.data.user,
        date: (new Date()).getTime(),
        text: parameters.data.text,
      };
      contacts.forEach((item) => {
        item.send(JSON.stringify({
          event: 'newMessage',
          data: message,
        }));
      });
    }
  });

  ws.on('close', () => {
    contacts = contacts.filter((item) => item.name !== ws.name);
    contacts.forEach((item) => {
      item.send(JSON.stringify({
        event: 'disconnectedUser',
        data: contacts.map((contact) => contact.name),
      }));
    });
  });
});

server.listen(port, (err) => {
  if (err) {
    console.log('Error occured:', err);
    return;
  }
  console.log(`Server is listening on ${port} port`);
});
