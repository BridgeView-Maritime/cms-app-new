// client/src/components/candidate/DateField.jsx
// The candidate portal's date input: the shared calendar, wearing the portal's
// `cp-` styles. Kept as its own module so the portal's call sites are unchanged.
import React from 'react';
import CalendarPicker from '../CalendarPicker';

export default function DateField(props) {
  return <CalendarPicker {...props} prefix="cp" />;
}
