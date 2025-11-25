import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Box,
  ListItemIcon,
} from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import CategoryIcon from "@mui/icons-material/Category";
import NearMeIcon from "@mui/icons-material/NearMe";
import { TypographyCustom } from "../../../../components/TypographyCustom";
import { IconCustom } from "../../../../components/IconCustom";

interface UsagePurposeFilterProps {
  usagePurposes: string[];
  selectedUsagePurpose: string;
  onSelectUsagePurpose: (category: string) => void;
}

const UsagePurposeFilter: React.FC<UsagePurposeFilterProps> = ({
  usagePurposes,
  selectedUsagePurpose,
  onSelectUsagePurpose,
}) => {
  const [expanded, setExpanded] = React.useState<boolean>(false);

  const handleChange = (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded);
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={handleChange}
      sx={{
        margin: "0 !important",
      }}
    >
      <AccordionSummary
        expandIcon={
          expanded ? (
            <IconCustom component={RemoveIcon} sx={{ color: "#6512c2" }} />
          ) : (
            <IconCustom component={AddIcon} sx={{ color: "#6512c2" }} />
          )
        }
        sx={{
          padding: "8px",
          borderBottom: "1px solid #ddd",
          backgroundColor: "#f5f5f5",
          minHeight: "auto !important",
          "& .MuiAccordionSummary-content": {
            margin: "0 !important",
          },
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          sx={{
            gap: {
              sm: 1,
              lg: 2,
            },
          }}
        >
          <IconCustom component={CategoryIcon} sx={{ color: "#6512c2" }} />
          <TypographyCustom customcolor="#6512c2">Mục đích sử dụng</TypographyCustom>
        </Box>
      </AccordionSummary>
      <AccordionDetails
        sx={{
          padding: "0",
        }}
      >
        <Box>
          <List>
            {usagePurposes.map((usagePurpose) => (
              <ListItem
                button
                key={usagePurpose}
                selected={selectedUsagePurpose === usagePurpose}
                onClick={() => onSelectUsagePurpose(usagePurpose)}
                sx={{
                  padding: "4px 8px",
                  alignItems: "center",
                  "&:hover": {
                    backgroundColor: "#f0f0f0",
                  },
                  color: "#6512c2",
                }}
              >
                <ListItemIcon sx={{ minWidth: "32px", color: "#6512c2" }}>
                  <IconCustom
                    component={NearMeIcon}
                    sx={{ color: "#6512c2" }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <TypographyCustom customcolor="#6512c2">
                      {usagePurpose}
                    </TypographyCustom>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default UsagePurposeFilter;
