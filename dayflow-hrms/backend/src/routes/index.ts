/**
 * API Router aggregator — mounts every resource router at its CONTRACT.md §5 prefix.
 *
 * STUB PHASE (B1): all handlers currently return 501 Not Implemented.
 *
 * Not yet wired into an app.ts — A's backend/src/config bootstrap doesn't exist yet.
 * Once it does, mount this router under `/api`, e.g.:
 *   import apiRouter from './routes';
 *   app.use('/api', apiRouter);
 */
import { Router } from 'express';
import authRoutes from './auth.routes';
import employeesRoutes from './employees.routes';
import departmentsRoutes from './departments.routes';
import leaveRequestsRoutes from './leave-requests.routes';
import attendanceRoutes from './attendance.routes';
import payrollRoutes from './payroll.routes';
import documentsRoutes from './documents.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/employees', employeesRoutes);
apiRouter.use('/departments', departmentsRoutes);
apiRouter.use('/leave-requests', leaveRequestsRoutes);
apiRouter.use('/attendance', attendanceRoutes);
apiRouter.use('/payroll', payrollRoutes);
apiRouter.use('/documents', documentsRoutes);

export default apiRouter;
