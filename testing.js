'use client';

/* eslint-disable react/jsx-filename-extension */
import ALL_MODULES from '@/common/constants/all-modules.constant';
import CHECKS_PERMISSIONS from '@/common/constants/checks-permissions.constant';
import useCountryCity from '@/common/hooks/use-country-city.hook';
import useDataTablePageSize from '@/common/hooks/use-data-table-page-size.hook';
import removeEmptyKeys from '@/common/hooks/use-remove-empty-keys';
import useDebounce from '@/common/hooks/useDebounce';
import CircleIcon from '@/common/icons/circle.icon';
import CommentIcon from '@/common/icons/comment.icon';
import DeleteIcon from '@/common/icons/delete.icon';
import EyeIcon from '@/common/icons/eye.icon';
import PencilIcon from '@/common/icons/pencil.icon';
import UploadIcon from '@/common/icons/upload.icon';
import hasPermission from '@/common/utils/permissions-utils/permissions-utils';
import useCustomTranslation from '@/locals/useCustomTransition';
import { createCustomerComment } from '@/provider/features/customer-comments/customer-comments.slice';
import {
  customerDuplicate,
  deleteCustomer,
  getAllCustomer,
  updateCustomer,
} from '@/provider/features/customer/customer.slice';
import { yupResolver } from '@hookform/resolvers/yup';
import { ContentCopy } from '@mui/icons-material';
import { GridActionsCellItem } from '@mui/x-data-grid';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import * as yup from 'yup';

const FEATURES_TO_BE_SHOW = {
  id: 'ID #',
  firstName: 'First Name',
  lastName: 'Last Name',
  isActive: 'Status',
  gender: 'Gender',
  address: 'Address',
  country: 'Country',
  city: 'City',
  postalCode: 'Postal Code',
  companyName: 'Company Name',
  companyAddress: 'Company Address',
  companyPhone: 'Company Phone Number',
  companyEmail: 'Company Email Address',
  companyMobile: 'Company Mobile Number',
  companyFax: 'Fax Number',
  tin: 'TIN',
};

const FEATURES_WIDTH = {
  id: 90,
  firstName: 200,
  lastName: 200,
  email: 150,
  phone: 150,
  isActive: 200,
  gender: 90,
  address: 200,
  state: 100,
  country: 150,
  city: 150,
  postalCode: 150,
  companyName: 200,
  companyAddress: 200,
  companyPhone: 200,
  companyEmail: 200,
  companyMobile: 200,
  companyFax: 150,
  tin: 100,
};

const DEFAULT_COLUMNS = [
  'id',
  'firstName',
  'lastName',
  'companyName',
  'companyAddress',
  'isActive',
];

const FEATURES_TO_BE_IGNORE = [
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
];

export default function useCustomer() {
  const fileInputRef = useRef();
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [openFilterPopup, setOpenFilterPopup] = useState(false);
  const [shouldClick, setShouldClick] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);

  const { t } = useCustomTranslation();
  const actionsOption = [
    {
      label: t('ActionOptions.Edit'),
      icon: <PencilIcon />,
      onClick: (row) => {
        handleEditAction(row);
      },
    },
    {
      // label: 'Active/In-active',
      label: t('ActionOptions.ActiveInActive'),
      icon: <CircleIcon />,
      onClick: () => {},
    },
    {
      label: t('ActionOptions.ViewDetail'),
      icon: <EyeIcon />,
      onClick: (row) => {
        handleViewAction(row);
      },
    },
    hasPermission(ALL_MODULES.CUSTOMER, CHECKS_PERMISSIONS.ADD_COMMENT)
      ? {
          label: t('ActionOptions.AddComments'),
          icon: <CommentIcon />,
          onClick: (row) => {
            handleAddCommentAction(row);
          },
        }
      : null,
    hasPermission(ALL_MODULES.CUSTOMER, CHECKS_PERMISSIONS.UPLOAD_FILE)
      ? {
          label: t('ActionOptions.UploadFiles'),
          icon: <UploadIcon />,
          onClick: (row) => {
            setRowData(row);
            fileInputRef?.current?.click();
          },
        }
      : null,
    {
      label: t('ActionOptions.Delete'),
      icon: <DeleteIcon />,
      onClick: (row) => {
        handleDeleteAction(row);
      },
    },
  ];

  useEffect(() => {
    if (shouldClick) {
      // The ref is available, trigger the click event
      fileInputRef.current.click();
      setShouldClick(false);
    }
  }, [shouldClick]);
  const getActionColumn = (statusText) => {
    return {
      field: 'actions',
      headerName: 'Action',
      headerClassName: 'table-heading ',
      cellClassName: 'table-data ',
      type: 'actions',
      width: 100,
      getActions: (cell) => [
        <GridActionsCellItem
          icon={<PencilIcon />}
          label={t('offerCreation.Edit')}
          onClick={() => handleEditAction(cell.row)}
          showInMenu
        />,
        <GridActionsCellItem
          icon={<CircleIcon />}
          label={t('ActionOptions.ActiveInActive')}
          onClick={() => handleStatusAction(cell.row)}
          showInMenu
        />,
        <GridActionsCellItem
          icon={<EyeIcon />}
          label={t('ActionOptions.ViewDetail')}
          onClick={() => handleViewAction(cell.row)}
          showInMenu
        />,
        <GridActionsCellItem
          icon={<CommentIcon />}
          label={t('ActionOptions.AddComments')}
          onClick={() => handleAddCommentAction(cell.row)}
          showInMenu
        />,
        <GridActionsCellItem
          icon={<UploadIcon />}
          label={t('ActionOptions.UploadFiles')}
          onClick={() => handleUploadAction(cell.row)}
          showInMenu
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label={'ActionOptions.Delete'}
          onClick={() => handleDeleteAction(cell.row)}
          showInMenu
        />,
      ],
    };
  };

  const getColumns = (dataObject) => {
    const columns = [];
    Object.keys(dataObject).forEach((key) => {
      let columnObject = {
        field: key,
        headerName: FEATURES_TO_BE_SHOW[key],
        headerClassName: 'table-heading ',
        cellClassName: 'table-data ',
        width: FEATURES_WIDTH[key],
      };
      if (!FEATURES_TO_BE_IGNORE.includes(key)) {
        if (key === 'isActive') {
          columnObject = {
            ...columnObject,
            renderCell: (params) => (
              <span
                className={
                  params.value
                    ? 'status-active tw-bg-[#1D4ED81A]'
                    : 'status-error'
                }
              >
                {params.value ? 'Active' : 'In-active'}
              </span>
            ),
          };
        }
        if (FEATURES_TO_BE_SHOW[key]) {
          columns.push(columnObject);
        }
      }
    });
    columns.push(getActionColumn('Active'));
    return columns;
  };

  const initialColumnState = (columns) => {
    return columns.reduce((acc, column, idx) => {
      if (
        DEFAULT_COLUMNS.includes(column.field) ||
        column.field === 'actions'
      ) {
        acc[column.field] = true;
      } else acc[column.field] = false;
      return acc;
    }, {});
  };

  const { handleCountryChange, cities, error, setError, setCountry, country } =
    useCountryCity();

  const dispatch = useDispatch();
  const router = useRouter();

  const [columnState, setColumnState] = useState([]);
  const [open, setOpen] = useState(false);
  const [showToaster, setShowToaster] = useState(false);
  const [toasterMsg, setToasterMsg] = useState('');
  const [tableColumns, setTableColumns] = useState([]);
  const [tableRows, setTableRows] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [openFilterModal, setOpenFilterModal] = useState(false);
  const [openConfirmationModal, setOpenConfirmationModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [confirmationActionType, setConfirmationActionType] = useState('');
  const ref = useRef(null);
  const [allPriceGroup, setAllPriceGroup] = useState([]);
  const [selectedPriceGroup, setSelectedPriceGroup] = useState([]);
  const [allDiscountGroup, setAllDiscountGroup] = useState([]);
  const [selectedDiscountGroup, setSelectedDiscountGroup] = useState([]);
  const [selectedColumn, setSelectedColumn] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [dataTotallRecords, setDataTotallRecords] = useState(null);
  const [tablePageNum, setTablePageNum] = useState(1);
  const { tablePageSize, setTablePageSize } = useDataTablePageSize();
  const [rowData, setRowData] = useState('');
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [dataTotalRecords, setDataTotalRecords] = useState(0); // Total record count for pagination
  const [loading, setLoading] = useState(false); // Prevent duplicate API calls

  // Flag to prevent duplicate fetch calls during refresh or re-renders
  const isDataCached = useRef(false);

  const debouncedSearchQuery = useDebounce(searchText, 1000);
  const isLoading = useSelector((state) => state.customer.getAll.isLoading);
  const doubleActionOption = {
    active: [
      hasPermission(ALL_MODULES.CUSTOMER, CHECKS_PERMISSIONS.UPDATE_CUSTOMER)
        ? {
            label: t('ActionOptions.Edit'),
            icon: <PencilIcon />,
            onClick: (row) => {
              handleEditAction(row);
            },
          }
        : null,
      {
        label: t('ActionOptions.InActive'),
        icon: <CircleIcon />,
        onClick: async (row) => {
          await dispatch(
            updateCustomer({
              payload: { data: { isActive: false }, id: row.id },
            })
          );
          fetchData();
        },
      },
      {
        label: t('ActionOptions.Duplicate'),
        icon: (
          <ContentCopy className='tw-h-[17px] tw-w-[17px] tw-text-[#7e7d7d]' />
        ),
        onClick: async (row) => {
          const response = await dispatch(
            customerDuplicate({
              payload: {
                customerId: row.id,
              },
            })
          );

          if (response.meta.requestStatus === 'fulfilled') {
            router.push(
              `/customer/edit?id=${response.payload.data.id}&d-id=${response.payload.data.displayId}`
            );
          }
        },
      },
      {
        label: t('ActionOptions.ViewDetail'),
        icon: <EyeIcon />,
        onClick: (row) => {
          handleViewAction(row);
        },
      },
      hasPermission(ALL_MODULES.CUSTOMER, CHECKS_PERMISSIONS.ADD_COMMENT)
        ? {
            label: t('ActionOptions.AddComments'),
            icon: <CommentIcon />,
            onClick: (row) => {
              handleAddCommentAction(row);
            },
          }
        : null,
      hasPermission(ALL_MODULES.CUSTOMER, CHECKS_PERMISSIONS.UPLOAD_FILE)
        ? {
            label: t('ActionOptions.UploadFiles'),
            icon: <UploadIcon />,
            onClick: (row) => {
              setRowData(row);
              setShouldClick(true);
            },
          }
        : null,
      hasPermission(ALL_MODULES.CUSTOMER, CHECKS_PERMISSIONS.DELETE_CUSTOMER)
        ? {
            label: t('ActionOptions.Delete'),
            icon: <DeleteIcon />,
            onClick: (row) => {
              handleDeleteAction(row);
            },
          }
        : null,
    ].filter((item) => item !== null),
    inActive: [
      hasPermission(ALL_MODULES.CUSTOMER, CHECKS_PERMISSIONS.UPDATE_CUSTOMER)
        ? {
            label: t('ActionOptions.Edit'),
            icon: <PencilIcon />,
            onClick: (row) => {
              handleEditAction(row);
            },
          }
        : null,
      {
        label: t('ActionOptions.Active'),
        icon: <CircleIcon />,
        onClick: async (row) => {
          await dispatch(
            updateCustomer({
              payload: { data: { isActive: true }, id: row.id },
            })
          );
          fetchData();
        },
      },
      {
        label: t('ActionOptions.Duplicate'),
        icon: (
          <ContentCopy className='tw-h-[17px] tw-w-[17px] tw-text-[#7e7d7d]' />
        ),
        onClick: async (row) => {
          const response = await dispatch(
            customerDuplicate({
              payload: {
                customerId: row.id,
              },
            })
          );

          if (response.meta.requestStatus === 'fulfilled') {
            router.push(
              `/customer/edit?id=${response.payload.data.id}&d-id=${response.payload.data.displayId}`
            );
            fetchData();
          }
        },
      },
      {
        label: t('ActionOptions.ViewDetail'),
        icon: <EyeIcon />,
        onClick: (row) => {
          handleViewAction(row);
        },
      },
      hasPermission(ALL_MODULES.CUSTOMER, CHECKS_PERMISSIONS.ADD_COMMENT)
        ? {
            label: t('ActionOptions.AddComment'),
            icon: <CommentIcon />,
            onClick: (row) => {
              handleAddCommentAction(row);
            },
          }
        : null,
      hasPermission(ALL_MODULES.CUSTOMER, CHECKS_PERMISSIONS.UPLOAD_FILE)
        ? {
            label: t('ActionOptions.UploadFiles'),
            icon: <UploadIcon />,
            onClick: (row) => {
              setRowData(row);
              setShouldClick(true);
            },
          }
        : null,
      hasPermission(ALL_MODULES.CUSTOMER, CHECKS_PERMISSIONS.DELETE_CUSTOMER)
        ? {
            label: t('ActionOptions.Delete'),
            icon: <DeleteIcon />,
            onClick: (row) => {
              handleDeleteAction(row);
            },
          }
        : null,
    ].filter((item) => item !== null),
  };

  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (ref.current && !ref.current.contains(event.target)) {
  //       setOpen(false);
  //     }
  //   };

  //   document.addEventListener('mousedown', handleClickOutside);
  //   return () => {
  //     document.removeEventListener('mousedown', handleClickOutside);
  //   };
  // }, [ref]);

  const validationSchema = yup.object({
    customerComment: yup
      .string()
      .required('CommentIsRequired')

      .min(1, 'CommentMustBeAtLeast1CharacterLong')
      .max(50000, 'CommentMustBeAtMost50000CharactersLong'),
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
    reValidateMode: 'onChange',
  });

  const {
    register: filterRegister,
    handleSubmit: filterHandleSubmit,
    setValue: filterSetValue,
    reset: filterReset,
    control: filterControl,
    formState: { errors: filterErrors },
  } = useForm();

  const onCountryChange = (e) => {
    filterSetValue('country', e.target.value);
    filterSetValue('city', '');
    handleCountryChange(e);
  };

  const onSubmitFilterForm = async (value) => {
    const priceGroupIds = selectedPriceGroup.map((item) => ({
      '$priceGroup.price_group_name$': item.label,
    }));
    const discountGroupIds = selectedDiscountGroup?.map((item) => ({
      '$discountGroup.discount_group_name$': item.label,
    }));

    const payloadData = {
      companyName: { $iLike: `%${value?.companyName}%` },
      companyEmail: value.companyEmail,
      country: value.country,
      city: value.city === 'Select City' ? '' : value.city,
      $or: [...discountGroupIds, ...priceGroupIds],
    };
    const cleanData = removeEmptyKeys(payloadData);
    // eslint-disable-next-line no-restricted-syntax
    for (const item in value) {
      if (!DEFAULT_COLUMNS.includes(item) && value[item].trim() !== '') {
        DEFAULT_COLUMNS.push(item);
      }
    }

    // Update active filters for display
    updateActiveFilters(value);

    fetchData(cleanData);
    setOpenFilterPopup(false);
  };

  const updateActiveFilters = (filterValues) => {
    const filters = [];

    // Company name filter
    if (filterValues.companyName) {
      filters.push({
        key: 'companyName',
        label: t('showAllColumns.CompanyName'),
        value: filterValues.companyName,
      });
    }

    // Company email filter
    if (filterValues.companyEmail) {
      filters.push({
        key: 'companyEmail',
        label: t('showAllColumns.CompanyEmail'),
        value: filterValues.companyEmail,
      });
    }

    // Country filter
    if (filterValues.country) {
      filters.push({
        key: 'country',
        label: t('showAllColumns.Country'),
        value: filterValues.country,
      });
    }

    // City filter
    if (filterValues.city && filterValues.city !== 'Select City') {
      filters.push({
        key: 'city',
        label: t('showAllColumns.City'),
        value: filterValues.city,
      });
    }

    // Price group filter
    if (selectedPriceGroup && selectedPriceGroup.length > 0) {
      filters.push({
        key: 'priceGroup',
        label: 'Price Group',
        value: selectedPriceGroup.map((item) => item.label).join(', '),
      });
    }

    // Discount group filter
    if (selectedDiscountGroup && selectedDiscountGroup.length > 0) {
      filters.push({
        key: 'discountGroup',
        label: 'Discount Group',
        value: selectedDiscountGroup.map((item) => item.label).join(', '),
      });
    }

    setActiveFilters(filters);
  };

  const handleRemoveFilter = (filterKey) => {
    // Remove the specific filter and reset related state
    switch (filterKey) {
      case 'companyName':
        filterReset({ ...filterRegister, companyName: '' });
        break;
      case 'companyEmail':
        filterReset({ ...filterRegister, companyEmail: '' });
        break;
      case 'country':
        filterReset({ ...filterRegister, country: '', city: '' });
        setCountry('');
        break;
      case 'city':
        filterReset({ ...filterRegister, city: '' });
        break;
      case 'priceGroup':
        setSelectedPriceGroup([]);
        break;
      case 'discountGroup':
        setSelectedDiscountGroup([]);
        break;
      default:
        break;
    }

    // Remove the filter from active filters
    const updatedFilters = activeFilters.filter(
      (filter) => filter.key !== filterKey
    );
    setActiveFilters(updatedFilters);

    // Refresh data without the removed filter
    fetchData();
  };

  const handleClearAllFilters = () => {
    // Reset all filter states
    filterReset();
    setSelectedPriceGroup([]);
    setSelectedDiscountGroup([]);
    setCountry('');
    setActiveFilters([]);

    // Refresh data without any filters
    fetchData();
  };

  const modalCloseHandler = () => {
    setOpenFilterPopup(false);
    setOpenModal(false);
    reset();
    fetchData();
  };

  const filterModalCloseHandler = () => {
    setOpenFilterPopup(false);
    filterReset();
    fetchData();
  };

  // const fetchData = async (condition = {}) => {
  //   const data = await dispatch(
  //     getAllCustomer({
  //       payload: {
  //         page: tablePageNum,
  //         pageSize: tablePageSize,
  //         sortColumn: 'id',
  //         sortOrder: 'DESC',
  //         condition
  //       }
  //     })
  //   );
  //   let columnData = FEATURES_TO_BE_SHOW;
  //   let rows = [];
  //   if (data?.payload?.TotalRecords > 0) {
  //     // eslint-disable-next-line prefer-destructuring
  //     columnData = data.payload.data[0];
  //     rows = data.payload.data.map((item) => {
  //       return {
  //         ...item,
  //         status: item.isStatus === true ? 'customer_active' : 'customer_inactive'
  //       };
  //     });
  //   }
  //   const columns = getColumns(columnData);
  //   setColumnState(initialColumnState(columns));
  //   setTableColumns(columns);
  //   setTableRows(rows);
  //   setDataTotallRecords(data?.payload?.TotalRecords);
  // };

  // Fetch data from the API
  const fetchData = async (condition = {}) => {
    // Check if data is already being fetched
    if (loading) return;

    setLoading(true);
    try {
      const response = await dispatch(
        getAllCustomer({
          payload: {
            page: tablePageNum,
            pageSize: tablePageSize,
            sortColumn: 'id',
            sortOrder: 'DESC',
            condition,
          },
        })
      );

      // Set table data
      if (response.payload?.data) {
        setTableRows(response.payload.data);
        setDataTotallRecords(response.payload.TotalRecords || 0);
        isDataCached.current = true; // Mark data as cached
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleColShow = () => {
    setOpen(true);
  };

  const handleToggleColumn = (columnName) => {
    setColumnState({
      ...columnState,
      [columnName]: !columnState[columnName],
    });
  };

  const handleEditAction = (row) => {
    router.push(`/customer/edit?id=${row.id}&d-id=${row.displayId}`);
  };

  const handleViewAction = (row) => {
    router.push(`/customer/details?id=${row.id}&d-id=${row.displayId}`);
  };

  const confirmationModalCloseHandler = () => {
    setOpenConfirmationModal(false);
  };

  const handleDeleteAction = (row) => {
    setConfirmationActionType('delete');
    setOpenConfirmationModal(true);
    setSelectedRow(row);
  };

  const handleStatusAction = async (row) => {
    setConfirmationActionType('status');
    setOpenConfirmationModal(true);
    setSelectedRow(row);
  };

  const confirmationModalHandler = async () => {
    try {
      setLoadingDelete(true);

      if (selectedRow) {
        if (confirmationActionType === 'delete') {
          const data = await dispatch(
            deleteCustomer({ payload: selectedRow.id })
          );
          if (data?.payload) {
            fetchData();
          }
        }

        if (confirmationActionType === 'status') {
          const data = await dispatch(
            updateCustomer({
              payload: {
                data: {
                  isActive: !selectedRow.isActive,
                },
                id: selectedRow.id,
              },
            })
          );
          if (data?.payload) {
            fetchData();
          }
        }

        setOpenConfirmationModal(false);
        setSelectedRow(null);
        setConfirmationActionType('');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingDelete(false);
    }
  };

  const handleAddCommentAction = (row) => {
    setOpenModal(true);
    setSelectedRow(row);
  };

  const handleUploadAction = (row) => {};

  const handleManageColumns = () => {
    setOpen(true);
  };

  const onCommentSubmit = (data) => {
    const payloadData = {
      customerId: selectedRow.id,
      comment: data.customerComment,
    };
    try {
      dispatch(createCustomerComment({ payload: payloadData }));
      setOpenModal(false);
      reset();
    } catch (err) {
      console.error('Error on adding the comment:', err);
    }
  };

  useMemo(() => {
    if (debouncedSearchQuery && debouncedSearchQuery?.length !== 0) {
      let query;
      if (selectedColumn === 'all') {
        query = {
          $or: [
            { id: parseInt(debouncedSearchQuery, 10) },
            { firstName: { $iLike: `%${debouncedSearchQuery}%` } },
            { lastName: { $iLike: `%${debouncedSearchQuery}%` } },
            { address: { $iLike: `%${debouncedSearchQuery}%` } },
            { country: { $iLike: `%${debouncedSearchQuery}%` } },
            { postalCode: { $iLike: `%${debouncedSearchQuery}%` } },
            { companyName: { $iLike: `%${debouncedSearchQuery}%` } },
            { companyPhone: { $iLike: `%${debouncedSearchQuery}%` } },
            { companyEmail: { $iLike: `%${debouncedSearchQuery}%` } },
            { companyMobile: { $iLike: `%${debouncedSearchQuery}%` } },
            { companyFax: { $iLike: `%${debouncedSearchQuery}%` } },
            { tin: { $iLike: `%${debouncedSearchQuery}%` } },
          ],
        };
      } else {
        query = {
          [selectedColumn]:
            selectedColumn === 'id'
              ? parseInt(debouncedSearchQuery, 10)
              : { $iLike: `%${debouncedSearchQuery}%` },
        };
        if (!DEFAULT_COLUMNS.includes(selectedColumn)) {
          DEFAULT_COLUMNS.push(selectedColumn);
        }
      }

      fetchData(query);
    } else {
      fetchData();
    }
  }, [debouncedSearchQuery, selectedColumn]);

  // useEffect(() => {
  //   fetchData();
  // }, [searchText, tablePageNum, tablePageSize]);
  useEffect(() => {
    // Only fetch data if not cached
    if (!isDataCached.current) {
      fetchData();
    }
  }, [tablePageNum, tablePageSize]);

  const handleItemsPerPage = (value) => {
    setItemsPerPage(value);
  };

  const handleUploadButtonClick = (row) => {
    setRowData(row);
    fileInputRef?.current?.click();
  };

  return {
    handleColShow,
    open,
    columns: tableColumns,
    columnState,
    rows: tableRows,
    handleToggleColumn,
    showToaster,
    toasterMsg,
    setShowToaster,
    register,
    handleSubmit,
    setValue,
    errors,
    openModal,
    setOpenModal,
    modalCloseHandler,
    openConfirmationModal,
    setOpenConfirmationModal,
    confirmationModalCloseHandler,
    confirmationModalHandler,
    selectedRow,
    confirmationActionType,
    onCommentSubmit,
    ref,
    searchText,
    setSearchText,
    setColumnState,
    handleItemsPerPage,
    itemsPerPage,
    currentPage,
    setCurrentPage,
    filterModalCloseHandler,
    openFilterModal,
    setOpenFilterModal,
    selectedDiscountGroup,
    selectedPriceGroup,
    allDiscountGroup,
    allPriceGroup,
    handleCountryChange,
    cities,
    error,
    setError,
    setCountry,
    country,
    onCountryChange,
    setAllPriceGroup,
    setSelectedPriceGroup,
    setAllDiscountGroup,
    setSelectedDiscountGroup,
    onSubmitFilterForm,
    activeFilters,
    handleRemoveFilter,
    handleClearAllFilters,
    selectedColumn,
    setSelectedColumn,
    actionsOption,
    isLoading,
    dataTotallRecords,
    tablePageNum,
    setTablePageNum,
    tablePageSize,
    setTablePageSize,
    openFilterPopup,
    setOpenFilterPopup,
    filterRegister,
    filterHandleSubmit,
    filterControl,
    fileInputRef,
    rowData,
    doubleActionOption,
    loadingDelete,
  };
}
