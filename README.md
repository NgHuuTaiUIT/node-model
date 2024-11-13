## Install: 
  npm install
## Run: npm 
  run start
## Routes: 
  - /getFile: @param { name: file name in models folder }
  - /web-worker: @param { name: file name in models folder, URL: url model }
  - /create-thumbnail:  @param { name: file name in models folder, URL: url model }
## Test Local
  To view: http://localhost:8000/web-worker?url=https://dev-api-ee.mymy.io/api/v1/assets/public-sharing/KVcxjGyUVTGXJur
  
  To view local file: http://localhost:8000/web-worker?name=test.glb
  
  To create thumbnail: http://localhost:8000/create_thumbnail?url=https://dev-api-ee.mymy.io/api/v1/assets/public-sharing/KVcxjGyUVTGXJur
  
  To create thumbnail local file: http://localhost:8000/create_thumbnail?name=test.glb
  
