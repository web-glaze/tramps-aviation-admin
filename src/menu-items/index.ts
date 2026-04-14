import dashboard from './dashboard';
import AgentPages from './agents';
import BookingPages from './bookings';
import { FinancePages, MarketingPages, ContentPages, SettingPages } from './finance';

const menuItems = {
  items: [dashboard, AgentPages, BookingPages, FinancePages, MarketingPages, ContentPages, SettingPages],
};

export type IMenuItems = typeof menuItems;
export default menuItems;
