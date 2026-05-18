import {
  BookOutlined, CarOutlined, HomeOutlined, InsuranceOutlined, TagOutlined,
} from '@ant-design/icons';
import { PERMISSIONS } from '../constants/permissions';

const BookingPages = {
  id: 'bookings-group',
  title: 'Travel & Bookings',
  type: 'group',
  children: [
    {
      id: 'bookings',
      title: 'All Bookings',
      type: 'item',
      url: '/bookings',
      icon: BookOutlined,
      permission: PERMISSIONS.BOOKINGS_VIEW,
    },
    {
      id: 'flights',
      title: 'Flights',
      type: 'item',
      url: '/flights',
      icon: CarOutlined,
      permission: PERMISSIONS.BOOKINGS_VIEW,
    },
    {
      id: 'hotels',
      title: 'Hotels',
      type: 'item',
      url: '/hotels',
      icon: HomeOutlined,
      permission: PERMISSIONS.BOOKINGS_VIEW,
    },
    {
      id: 'insurance',
      title: 'Insurance',
      type: 'item',
      url: '/insurance',
      icon: InsuranceOutlined,
      permission: PERMISSIONS.BOOKINGS_VIEW,
    },
    // Series Bookings — dedicated entry that re-uses the All Bookings page
    // with the `type=series` query param pre-applied. The bookings page
    // reads searchParams on mount and pre-selects the Series filter so the
    // list shows only TRAMPS-* tokenized bookings.
    {
      id: 'series-bookings',
      title: 'Series Bookings',
      type: 'item',
      url: '/bookings?type=series',
      icon: TagOutlined,
      permission: PERMISSIONS.BOOKINGS_VIEW,
    },
  ],
};

export default BookingPages;