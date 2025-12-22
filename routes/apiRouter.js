const express = require('express');
const apiController = require('../controllers/apiController');
const router = express.Router();

router.get('/farm/:farmId', apiController.getFarmDataById);

router.post('/recommend', apiController.postRecommendation);
router.post('/feedback', apiController.postFeedback);
router.get('/analytics', apiController.getAnalyticsData);
router.get('/feedback', apiController.getFeedback); 
router.get('/recommend/:userId', apiController.getRecentRecommendations);
router.get('/lang/:locale', (req, res) => {
    res.cookie('lang', req.params.locale);
    res.redirect('back'); 
}); 

module.exports = router;