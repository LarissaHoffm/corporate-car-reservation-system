import { Outlet, Navigate } from "react-router-dom";
export function AuthGuard(){ return true ? <Outlet/> : <Navigate to="/login" />; }
