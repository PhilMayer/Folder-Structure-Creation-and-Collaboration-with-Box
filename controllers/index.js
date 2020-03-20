/**
 * Load all controllers
 */
const express = require('express');
const router = express.Router();

const BoxSdk = require('../service/box/boxSdk');
const BoxConfig = require('config').boxAppSettings;

// REPLACE WITH YOUR OWN UNIQUE IDS
const A_ID = '11851571296'
const B_ID = '11851489646'
const C_ID = '11911453868'
const D_ID = '11912173756'

/**
 * base route
 */
router.get('/', async function(req, res) {
  // let clientA = BoxSdk.getAppAuthClient('user', A_ID);
  // let clientB = BoxSdk.getAppAuthClient('user', B_ID);
  // let clientC = BoxSdk.getAppAuthClient('user', C_ID);
  // let clientD = BoxSdk.getAppAuthClient('user', D_ID);

  let tokens = await Promise.all([
    BoxSdk.getAppUserTokens(A_ID),
    BoxSdk.getAppUserTokens(B_ID),
    BoxSdk.getAppUserTokens(C_ID),
    BoxSdk.getAppUserTokens(D_ID),
    BoxSdk.getEnterpriseAppAuthTokens(BoxConfig.enterpriseID)]
  )

  res.render('pages/home', {
    tokenA: tokens[0].accessToken,
    tokenB: tokens[1].accessToken,
    tokenC: tokens[2].accessToken,
    tokenD: tokens[3].accessToken,
    saToken: tokens[4].accessToken,
    users: {
      A: {
        id: A_ID,
        name: "Country Director"
      },
      B: {
        id: B_ID,
        name: "Programs Director"
      },
      C: {
        id: C_ID,
        name: "Program Manager"
      },
      D: {
        id: D_ID,
        name: "Budget Director"
      }
    }
  });
});

router.post("/create-new-program-folder", async function(req, res) {
  console.log(req.body);
  let client = BoxSdk.getAppAuthClient('enterprise', BoxConfig.enterpriseID);

  const FOLDERIDS = {
    europe: "107623144518",
    asia: "107622205677",
    northAmerica: "107622059623",
    southAmerica: "107622887999",
    africa: "107623020591",
    middleEast: "107623112810"
  }

  const countryFolder = await client.folders.create(FOLDERIDS[req.body.region], req.body.country);
  client.folders.create(countryFolder.id, "Finance");
  client.folders.create(countryFolder.id, "Operations");

  const programsFolder = await client.folders.create(countryFolder.id, "Programs");
  const programFolder = await client.folders.create(programsFolder.id, req.body.program);
  client.folders.create(programFolder.id, "Identification and Design");
  client.folders.create(programFolder.id, "Budget");
  client.folders.create(programFolder.id, "Implementation");
  client.folders.create(programFolder.id, "Monitoring and Evaluation");

  res.redirect('/')

})

/**
 * create folder collaboration
 */
router.post("/create-collaboration", async function(req, res) {
  let client = BoxSdk.getAppAuthClient('enterprise', BoxConfig.enterpriseID);

  const options = req.body.canViewPath ? { can_view_path: true } : null;

  await client.collaborations.createWithUserID(
    req.body.userId,
    req.body.folderId,
    client.collaborationRoles.EDITOR,
    options);

  res.redirect('/')
})

router.get("/add-devs-account", async function (req, res) {
  let client = BoxSdk.getAppAuthClient('enterprise', BoxConfig.enterpriseID);

  const options = { can_view_path: true };

  await client.collaborations.createWithUserEmail(
    "adev+sedemo@boxdemo.com",
    "105448210706",
    client.collaborationRoles.EDITOR,
    options);

  res.redirect('/')
})

/**
 * Endpoint to create 2 new users. Copy the 2 unique app user IDs and paste
 * in the A_ID, B_ID variables above
 */
router.get('/create-users', async function(req, res) {
  let client = BoxSdk.getAppAuthClient('enterprise', BoxConfig.enterpriseID);

  let userC = await client.enterprise.addAppUser('User C', null)
  console.log(userC);

  let userD = await client.enterprise.addAppUser('User D', null)
  console.log(userD);
});


/**
 * Route to reset all users' content
 */
router.get('/reset-content', async function(req, res) {
  let saClient = BoxSdk.getAppAuthClient('enterprise', BoxConfig.enterpriseID);
  let clientA = BoxSdk.getAppAuthClient('user', A_ID);
  let clientB = BoxSdk.getAppAuthClient('user', B_ID);
  let clientC = BoxSdk.getAppAuthClient('user', C_ID);
  let clientD = BoxSdk.getAppAuthClient('user', D_ID);

  await Promise.all([
    deleteAllContent(saClient),
    deleteAllContent(clientA),
    deleteAllContent(clientB),
    deleteAllContent(clientC),
    deleteAllContent(clientD)]
  );

  res.redirect('/')
})

/**
 * Helper function to delete all of a given user's content
 */
async function deleteAllContent(client) {
  let rootItems = await client.folders.getItems('0', { fields: 'name,created_by'});
  let user = await client.users.get(client.CURRENT_USER_ID, { fields: 'id'});

  rootItems.entries.forEach((item) => {
    if(user.id == item.created_by.id) {
      if(item.type == "folder") {
        client.folders.delete(item.id, {recursive: true})
      } else if(item.type == "file") {
        client.files.delete(item.id)
      }
    }
  })
}

module.exports = router;
