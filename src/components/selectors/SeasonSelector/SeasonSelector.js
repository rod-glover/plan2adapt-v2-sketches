import PropTypes from 'prop-types';
import React from 'react';
// import { TimeOfYearSelector } from 'pcic-react-components';
import TimeOfYearSelector from '../TimeOfYearSelector';


export default class SeasonSelector extends React.Component {
  static propTypes = {
    value: PropTypes.object,
    onChange: PropTypes.func,
  };

  render() {
    return (
      <TimeOfYearSelector
        {...this.props}
        monthly={false}
        hideDisabledOptions
      />
    );
  }
}
