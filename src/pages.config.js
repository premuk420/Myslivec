import GroundMap from './pages/GroundMap';
import Home from './pages/Home';
import ManageGround from './pages/ManageGround';
import Reservations from './pages/Reservations';
import GroundInfo from './pages/GroundInfo';
import Login from './pages/Login'; // <--- Tady jsme to přidali
import __Layout from './Layout.jsx';

export const PAGES = {
    "GroundMap": GroundMap,
    "Home": Home,
    "ManageGround": ManageGround,
    "Reservations": Reservations,
    "GroundInfo": GroundInfo,
    "Login": Login, // <--- A tady taky
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};