# Airline Web App

##### I got the idea for this app while I was searching for flights one day.
Even the airlines' own websites had very long loading times for flight searches.
I thought to myself, 'there must be a faster way to do this.'
I decided on an approach using websockets for incremental, low-latency loading and MongoDB for fast database queries.
The Vue.js client is currently just for testing the websocket requests, although I intend to develop it as a robust airline front-end after completing the back-end.

`/client` Houses the client-side app, build with the Vue.js `vue-cli` package.

`/server` Houses the Socket.io server which connects to a MongoDB database. (I use one on my local machine, and I dumped the current version into the `` file)
