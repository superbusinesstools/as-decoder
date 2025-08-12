import { Router } from 'express';
import queueController from '../controllers/queueController';

const router: Router = Router();

router.post('/queue', queueController.addToQueue.bind(queueController));
router.get('/queue/:company_id', queueController.getCompanyStatus.bind(queueController));

export default router;