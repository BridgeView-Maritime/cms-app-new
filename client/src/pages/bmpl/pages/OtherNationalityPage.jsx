// client/src/pages/bmpl/pages/OtherNationalityPage.jsx
// "Other Nationality Crew" - the same registration list as the shore CVs
// page, sliced by country instead of CV category.
import React from 'react';
import ShoreCvsPage from './ShoreCvsPage';

export default function OtherNationalityPage() {
  return <ShoreCvsPage mode="other" />;
}
