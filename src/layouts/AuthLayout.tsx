import { Outlet } from 'react-router-dom';
import { BrandFooter, BrandHeader } from '../components/common';

export function AuthLayout() {
  return (
    <div className="auth-screen">
      <BrandHeader />
      <Outlet />
      <BrandFooter />
    </div>
  );
}
