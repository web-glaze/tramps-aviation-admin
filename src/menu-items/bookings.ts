import {
  BookOutlined, CarOutlined, HomeOutlined, InsuranceOutlined,
} from '@ant-design/icons';

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
    },
    {
      id: 'flights',
      title: 'Flights',
      type: 'item',
      url: '/flights',
      icon: CarOutlined,
    },
    {
      id: 'hotels',
      title: 'Hotels',
      type: 'item',
      url: '/hotels',
      icon: HomeOutlined,
    },
    {
      id: 'insurance',
      title: 'Insurance',
      type: 'item',
      url: '/insurance',
      icon: InsuranceOutlined,
    },
  ],
};

export default BookingPages;