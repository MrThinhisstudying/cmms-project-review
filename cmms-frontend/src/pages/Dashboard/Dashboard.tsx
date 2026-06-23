import React from 'react';
import { useAuthContext } from '../../context/AuthContext/AuthContext';
import TechnicalDashboard from './TechnicalDashboard';
import HybridDashboard from './HybridDashboard';
import HRDashboard from '../HRDashboard';

/**
 * Smart Dashboard Router
 * 
 * Phân luồng dashboard theo vai trò:
 * - HR_MANAGER              → HRDashboard (nhân sự thuần)
 * - TECHNICIAN, OPERATOR    → TechnicalDashboard (kỹ thuật thuần)
 * - UNIT_HEAD, DIRECTOR,    → HybridDashboard (kỹ thuật + tóm tắt nhân sự)
 *   ADMIN, TEAM_LEAD
 */
const Dashboard: React.FC = () => {
    const { user } = useAuthContext();
    const role = user?.role || '';

    // HR Manager → Dashboard nhân sự
    if (role === 'HR_MANAGER') {
        return <HRDashboard />;
    }

    // Cán bộ quản lý → Hybrid Dashboard
    if (['ADMIN', 'DIRECTOR', 'UNIT_HEAD', 'TEAM_LEAD'].includes(role)) {
        return <HybridDashboard />;
    }

    // Kỹ thuật viên, Vận hành, và các role khác → Technical Dashboard
    return <TechnicalDashboard />;
};

export default Dashboard;
