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

/**
 * base route
 */
router.get('/', async function(req, res) {
  let clientA = BoxSdk.getAppAuthClient('user', A_ID);
  let clientB = BoxSdk.getAppAuthClient('user', B_ID);

  let tokens = await Promise.all([
    BoxSdk.getAppUserTokens(A_ID),
    BoxSdk.getAppUserTokens(B_ID),
    BoxSdk.getEnterpriseAppAuthTokens(BoxConfig.enterpriseID)]
  )

  res.render('pages/home', {
    tokenA: tokens[0].accessToken,
    tokenB: tokens[1].accessToken,
    saToken: tokens[2].accessToken,
    users: {
      A: {
        id: A_ID,
        name: "User A"
      },
      B: {
        id: B_ID,
        name: "User B"
      }
    }
  });
});

router.post("/create-new-program-folder", async function(req, res) {
  console.log(req.body);
  let client = BoxSdk.getAppAuthClient('enterprise', BoxConfig.enterpriseID);

  const FOLDERIDS = {
    europe: "105159613732",
    asia: "105159069024",
    northAmerica: "105159485653",
    southAmerica: "105158806832",
    africa: "105158781613",
    middleEast: "105158064907"
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

/**
 * Endpoint to create 2 new users. Copy the 2 unique app user IDs and paste
 * in the A_ID, B_ID variables above
 */
router.get('/create-users', async function(req, res) {
  let client = BoxSdk.getAppAuthClient('enterprise', BoxConfig.enterpriseID);

  let userA = await client.enterprise.addAppUser('User A', null)
  console.log(userA);

  let userB = await client.enterprise.addAppUser('User B', null)
  console.log(userB);
});


/**
 * Route to reset all users' content
 */
router.get('/reset-content', async function(req, res) {
  let saClient = BoxSdk.getAppAuthClient('enterprise', BoxConfig.enterpriseID);
  let clientA = BoxSdk.getAppAuthClient('user', A_ID);
  let clientB = BoxSdk.getAppAuthClient('user', B_ID);

  await Promise.all([
    deleteAllContent(saClient),
    deleteAllContent(clientA),
    deleteAllContent(clientB)]
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
