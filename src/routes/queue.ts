import { Router } from 'express';
import queueController from '../controllers/queueController';

const router: Router = Router();

router.post('/queue', queueController.addToQueue.bind(queueController));
router.get('/queue/status/recent', queueController.getRecentStatus.bind(queueController));
router.get('/queue/status/failed', queueController.getFailedJobs.bind(queueController));
router.post('/queue/:company_id/restart', queueController.restartJob.bind(queueController));
router.get('/queue/:company_id', queueController.getCompanyStatus.bind(queueController));

export default router;