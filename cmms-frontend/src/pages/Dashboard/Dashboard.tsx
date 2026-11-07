import React from 'react';
import { useAuthContext } from '../../context/AuthContext/AuthContext';
import TechnicalDashboard from './TechnicalDashboard';
import HybridDashboard from './HybridDashboard';
import { CompanyPoliciesBanner } from '../../components/CompanyPoliciesBanner';

/**
 * Unified Role-Adaptive Command Center Router
 *
 * Phân luồng Trang chủ thông minh theo Cấp bậc (Role) & Đặc thù Đơn vị (Kỹ thuật / Phi kỹ thuật / Nhân sự):
 * - ADMIN, DIRECTOR, UNIT_HEAD, TEAM_LEAD, HR_MANAGER → HybridDashboard (Trung tâm Điều hành Hợp nhất: Công việc + Kỹ thuật + Nhân sự)
 * - TECHNICIAN, OPERATOR, STAFF, MANAGER              → TechnicalDashboard (Bàn làm việc Cá nhân & Ca trực: Việc của tôi + Sửa chữa/Bảo dưỡng)
 */
const Dashboard: React.FC = () => {
    const { user } = useAuthContext();
    const role = (user?.role || '').toUpperCase();

    return (
        <>
            <CompanyPoliciesBanner />
            {['ADMIN', 'DIRECTOR', 'UNIT_HEAD', 'TEAM_LEAD', 'HR_MANAGER'].includes(role) ? (
                <HybridDashboard />
            ) : (
                <TechnicalDashboard />
            )}
        </>
    );
};

export default Dashboard;
